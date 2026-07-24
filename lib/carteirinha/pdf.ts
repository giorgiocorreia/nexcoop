// Gerador de PDF da carteirinha de identificação do filiado — impressão
// individual e em lote de uma peça DOBRÁVEL: frente e verso unidos numa só
// folha CR80 dupla (85,6 × 108 mm), pra cortar, dobrar ao meio e plastificar
// (pedido do Giorgio, 24/07/2026). pdf-lib de propósito (regra 10 do
// CLAUDE.md — pdfkit é incompatível com o runtime serverless da Vercel). Sem
// I/O de banco aqui: quem busca os dados é o route handler (app/imprimir/...),
// este módulo só recebe dados prontos e devolve bytes de PDF.

import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib'
import type { TipoOrganizacao } from '@/types/database'
import { mascararCpf } from '@/lib/carteirinha/carteirinha-utils'
import { gerarQrCodePngBuffer } from '@/lib/carteirinha/qrcode'
import { corPrimariaOrg } from '@/lib/tema'

// Dimensões de cada FACE do cartão — CR80 (85,6 × 54 mm) convertido pra
// pontos PDF (1 pt = 1/72 polegada; 1 polegada = 25,4 mm). A peça final
// dobrável tem o dobro da altura (frente + verso empilhados).
export const CARTAO_LARGURA = 242.6
export const CARTAO_ALTURA = 153.1

// Peça dobrável completa: 85,6 × 108 mm — frente na metade de cima, verso
// na metade de baixo (rotacionado 180°, ver desenharCartaoDobravel).
export const CARTAO_DOBRAVEL_ALTURA = CARTAO_ALTURA * 2

// 20 mm em pontos — tamanho MÍNIMO do QR no papel (não do PNG fonte).
// Abaixo disso a leitura falha em impressão comum (instrução do Giorgio).
const QR_LADO_MINIMO_PT = (20 / 25.4) * 72

export interface DadosCartaoCooperado {
  nome: string
  numeroMatricula: string | null
  cpf: string | null
  dataAdmissao: string | null
  validaAte: string | null
  fotoUrl: string | null
}

export interface DadosCartaoOrganizacao {
  nome: string
  logoUrl: string | null
  corPrimaria: string | null
  tipo: TipoOrganizacao
  email: string | null
  telefone: string | null
}

export interface DadosCartaoCarteirinha {
  codigo: string
  via: number
}

export interface DadosCartao {
  cooperado: DadosCartaoCooperado
  organizacao: DadosCartaoOrganizacao
  carteirinha: DadosCartaoCarteirinha
  urlVerificacao: string
}

// ── Download defensivo de imagens ───────────────────────────────────────────

interface ImagemBaixada {
  buffer: ArrayBuffer
  tipo: string
}

// Baixa uma imagem pública (foto do cooperado ou logo da org) com timeout.
// NUNCA lança: qualquer falha (URL fora do ar, timeout, tipo inesperado)
// devolve null e quem chama cai no placeholder — uma foto quebrada não pode
// derrubar a impressão de um lote de 200 cartões (pegadinha 3 do prompt).
async function baixarImagem(url: string | null): Promise<ImagemBaixada | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const tipo = res.headers.get('content-type') ?? ''
    return { buffer, tipo }
  } catch {
    return null
  }
}

// Embute a imagem já baixada no documento. pdf-lib só sabe embutir PNG e
// JPEG (pegadinha 2) — qualquer outro tipo (ex.: WEBP remanescente de upload
// anterior à restrição da fase 3) cai no placeholder em vez de derrubar a
// geração.
async function embutirImagem(pdfDoc: PDFDocument, dados: ImagemBaixada | null): Promise<PDFImage | null> {
  if (!dados) return null
  try {
    if (dados.tipo.includes('png')) return await pdfDoc.embedPng(dados.buffer)
    if (dados.tipo.includes('jpeg') || dados.tipo.includes('jpg')) return await pdfDoc.embedJpg(dados.buffer)
    return null
  } catch {
    return null
  }
}

// ── Utilitários de desenho ──────────────────────────────────────────────────

function hexParaRgb(hex: string) {
  const limpo = hex.replace('#', '')
  const full = limpo.length === 3 ? limpo.split('').map(c => c + c).join('') : limpo
  const n = parseInt(full, 16) || 0
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

// Ajusta um texto pra caber numa largura máxima: primeiro reduz o corpo da
// fonte até um mínimo, depois — se ainda não coube — trunca com reticências.
// Evita nomes de produtor rural (compridos) estourando o cartão (pegadinha
// citada no prompt).
function ajustarTexto(
  font: PDFFont,
  texto: string,
  larguraMax: number,
  tamanhoInicial: number,
  tamanhoMinimo = 6
): { texto: string; tamanho: number } {
  let tamanho = tamanhoInicial
  while (tamanho > tamanhoMinimo && font.widthOfTextAtSize(texto, tamanho) > larguraMax) {
    tamanho -= 0.5
  }
  if (font.widthOfTextAtSize(texto, tamanho) <= larguraMax) {
    return { texto, tamanho }
  }
  let truncado = texto
  while (truncado.length > 1 && font.widthOfTextAtSize(truncado + '…', tamanho) > larguraMax) {
    truncado = truncado.slice(0, -1)
  }
  return { texto: `${truncado}…`, tamanho }
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')
}

function iniciaisDoNome(nome: string): string {
  return nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// Desenha a foto em modo "contain" centralizado dentro da moldura — nunca
// distorce a imagem (Giorgio reportou rostos esticados quando a foto não
// tinha a mesma proporção da moldura). Calcula a escala pela MENOR razão
// entre moldura e imagem (usando as dimensões reais da imagem embutida, não
// presumidas), centraliza o resultado e preenche a faixa que sobrar nas
// laterais/topo-base com um cinza bem claro pra moldura continuar retangular.
// Defensivo: mesmo com o upload já recortando em 3:4 (foto-imagem.ts), fotos
// enviadas antes dessa mudança podem ter qualquer proporção.
function desenharFotoContain(page: PDFPage, image: PDFImage, x: number, y: number, w: number, h: number) {
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.96, 0.96, 0.96) })

  const escala = Math.min(w / image.width, h / image.height)
  const larguraDesenhada = image.width * escala
  const alturaDesenhada = image.height * escala
  const offsetX = x + (w - larguraDesenhada) / 2
  const offsetY = y + (h - alturaDesenhada) / 2

  page.drawImage(image, { x: offsetX, y: offsetY, width: larguraDesenhada, height: alturaDesenhada })
}

// Placeholder cinza com as iniciais — usado sempre que a foto não existe ou
// falhou ao baixar/embutir.
function desenharPlaceholderFoto(page: PDFPage, x: number, y: number, w: number, h: number, nome: string, fontBold: PDFFont) {
  page.drawRectangle({
    x, y, width: w, height: h,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.5,
  })
  const iniciais = iniciaisDoNome(nome)
  const size = Math.min(w, h) * 0.4
  const tw = fontBold.widthOfTextAtSize(iniciais, size)
  page.drawText(iniciais, {
    x: x + (w - tw) / 2,
    y: y + (h - size) / 2 + size * 0.12,
    size,
    font: fontBold,
    color: rgb(0.45, 0.45, 0.45),
  })
}

// Marcas de corte discretas nos 4 cantos do cartão — sem elas não há como
// recortar reto uma folha com 10 cartões.
function desenharMarcasDeCorte(page: PDFPage, x: number, y: number, w: number, h: number) {
  const tam = 6
  const cor = rgb(0.55, 0.55, 0.55)
  const espessura = 0.4
  const cantos = [
    { cx: x, cy: y },         // inferior-esquerdo
    { cx: x + w, cy: y },     // inferior-direito
    { cx: x, cy: y + h },     // superior-esquerdo
    { cx: x + w, cy: y + h }, // superior-direito
  ]
  for (const { cx, cy } of cantos) {
    page.drawLine({ start: { x: cx - tam, y: cy }, end: { x: cx + tam, y: cy }, thickness: espessura, color: cor })
    page.drawLine({ start: { x: cx, y: cy - tam }, end: { x: cx, y: cy + tam }, thickness: espessura, color: cor })
  }
}

interface ImagensCartao {
  fotoImg: PDFImage | null
  logoImg: PDFImage | null
  qrImg: PDFImage | null
}

// ── Frente do cartão ─────────────────────────────────────────────────────

// Desenha a frente dentro da caixa (x, y)–(x+CARTAO_LARGURA, y+CARTAO_ALTURA).
// Não desenha situação do vínculo (ATIVO/NÃO ATIVO) — decisão explícita do
// Giorgio: o cartão físico é estático e o status muda; quem responde isso ao
// vivo é o QR, nunca o plástico impresso.
function desenharFrente(
  page: PDFPage,
  x: number,
  y: number,
  dados: DadosCartao,
  imagens: ImagensCartao,
  fontRegular: PDFFont,
  fontBold: PDFFont
) {
  const w = CARTAO_LARGURA
  const h = CARTAO_ALTURA
  const cor = hexParaRgb(corPrimariaOrg({ tipo: dados.organizacao.tipo, cor_primaria: dados.organizacao.corPrimaria }))

  // Fundo branco + borda
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1), borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.75 })

  // Faixa superior com a cor da marca
  const headerH = 30
  page.drawRectangle({ x, y: y + h - headerH, width: w, height: headerH, color: cor })

  let logoW = 0
  if (imagens.logoImg) {
    const dim = imagens.logoImg.scaleToFit(22, 22)
    page.drawImage(imagens.logoImg, { x: x + 6, y: y + h - headerH + (headerH - dim.height) / 2, width: dim.width, height: dim.height })
    logoW = dim.width + 8
  }

  const orgTexto = ajustarTexto(fontBold, dados.organizacao.nome.toUpperCase(), w - logoW - 12, 9.5, 7)
  page.drawText(orgTexto.texto, {
    x: x + 6 + logoW,
    y: y + h - headerH + (headerH - orgTexto.tamanho) / 2 + 1,
    size: orgTexto.tamanho,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  // ── Corpo ──
  const margem = 8
  // Moldura em 3:4 exato (proporção de foto de documento/retrato) — igual à
  // saída do recorte no upload (lib/cooperados/foto-imagem.ts), pra fotos
  // novas entrarem sem nenhuma faixa sobrando.
  const fotoW = 45
  const fotoH = 60
  const fotoX = x + margem
  const fotoY = y + h - headerH - margem - fotoH

  if (imagens.fotoImg) {
    desenharFotoContain(page, imagens.fotoImg, fotoX, fotoY, fotoW, fotoH)
    page.drawRectangle({ x: fotoX, y: fotoY, width: fotoW, height: fotoH, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 })
  } else {
    desenharPlaceholderFoto(page, fotoX, fotoY, fotoW, fotoH, dados.cooperado.nome, fontBold)
  }

  // QR à direita, sempre com no mínimo 20mm de lado no papel.
  const qrLado = Math.max(QR_LADO_MINIMO_PT, 58)
  const qrX = x + w - margem - qrLado
  const qrY = y + margem + 4

  // Bloco de texto ocupa o espaço entre a foto e o QR.
  const textoX = fotoX + fotoW + 8
  const textoLargura = qrX - textoX - 8

  let cursorY = fotoY + fotoH - 9
  const nomeAjustado = ajustarTexto(fontBold, dados.cooperado.nome, textoLargura, 10, 7.5)
  page.drawText(nomeAjustado.texto, { x: textoX, y: cursorY, size: nomeAjustado.tamanho, font: fontBold, color: rgb(0.11, 0.11, 0.11) })
  cursorY -= 12

  const linhaInfo = (label: string, valor: string) => {
    const texto = `${label}: ${valor}`
    const ajustado = ajustarTexto(fontRegular, texto, textoLargura, 7.5, 6)
    page.drawText(ajustado.texto, { x: textoX, y: cursorY, size: ajustado.tamanho, font: fontRegular, color: rgb(0.35, 0.35, 0.35) })
    cursorY -= 10
  }

  if (dados.cooperado.numeroMatricula) linhaInfo('Matrícula', dados.cooperado.numeroMatricula)
  linhaInfo('Filiado desde', formatarData(dados.cooperado.dataAdmissao))
  if (dados.cooperado.cpf) linhaInfo('CPF', mascararCpf(dados.cooperado.cpf))
  if (dados.cooperado.validaAte) linhaInfo('Validade', formatarData(dados.cooperado.validaAte))

  if (imagens.qrImg) {
    page.drawRectangle({ x: qrX - 2, y: qrY - 2, width: qrLado + 4, height: qrLado + 4, color: rgb(1, 1, 1) })
    page.drawImage(imagens.qrImg, { x: qrX, y: qrY, width: qrLado, height: qrLado })
  }
}

// ── Verso do cartão ─────────────────────────────────────────────────────

// Sem QR duplicado — só a instrução, a URL em texto (fallback pra quem não
// consegue escanear), código/via e contato da org.
function desenharVerso(
  page: PDFPage,
  x: number,
  y: number,
  dados: DadosCartao,
  fontRegular: PDFFont,
  fontBold: PDFFont
) {
  const w = CARTAO_LARGURA
  const h = CARTAO_ALTURA
  const margem = 10
  const largura = w - margem * 2

  page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1), borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.75 })

  let cursorY = y + h - margem - 10

  page.drawText('VERIFICAÇÃO DE AUTENTICIDADE', { x: x + margem, y: cursorY, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
  cursorY -= 14

  const instrucao = 'Aponte a câmera do celular para o QR code e confirme a situação do filiado em tempo real.'
  cursorY = desenharParagrafo(page, instrucao, x + margem, cursorY, largura, 7, fontRegular, rgb(0.3, 0.3, 0.3), 9)
  cursorY -= 6

  page.drawText('Ou acesse:', { x: x + margem, y: cursorY, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })
  cursorY -= 10
  const urlAjustada = ajustarTexto(fontRegular, dados.urlVerificacao, largura, 7.5, 5.5)
  page.drawText(urlAjustada.texto, { x: x + margem, y: cursorY, size: urlAjustada.tamanho, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  cursorY -= 16

  page.drawLine({ start: { x: x + margem, y: cursorY }, end: { x: x + w - margem, y: cursorY }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) })
  cursorY -= 12

  page.drawText(`Código: ${dados.carteirinha.codigo}`, { x: x + margem, y: cursorY, size: 7, font: fontRegular, color: rgb(0.35, 0.35, 0.35) })
  page.drawText(`${dados.carteirinha.via}ª via`, { x: x + w - margem - 30, y: cursorY, size: 7, font: fontRegular, color: rgb(0.35, 0.35, 0.35) })
  cursorY -= 16

  const contato = [dados.organizacao.telefone, dados.organizacao.email].filter(Boolean).join(' · ')
  if (contato) {
    const contatoAjustado = ajustarTexto(fontRegular, contato, largura, 7, 5.5)
    page.drawText(contatoAjustado.texto, { x: x + margem, y: cursorY, size: contatoAjustado.tamanho, font: fontRegular, color: rgb(0.4, 0.4, 0.4) })
  }

  const rodape = 'nexcoop.com.br'
  const rw = fontRegular.widthOfTextAtSize(rodape, 6)
  page.drawText(rodape, { x: x + w - margem - rw, y: y + margem - 2, size: 6, font: fontRegular, color: rgb(0.65, 0.65, 0.65) })
}

// Quebra um texto simples em linhas que cabem em `largura`, desenhando cada
// linha e devolvendo o cursorY após a última. Usado só pro parágrafo curto
// de instrução do verso — não é um layout engine genérico.
function desenharParagrafo(
  page: PDFPage,
  texto: string,
  x: number,
  yInicial: number,
  largura: number,
  tamanho: number,
  font: PDFFont,
  cor: ReturnType<typeof rgb>,
  lineHeight: number
): number {
  const palavras = texto.split(' ')
  let linha = ''
  let y = yInicial
  for (const palavra of palavras) {
    const tentativa = linha ? `${linha} ${palavra}` : palavra
    if (font.widthOfTextAtSize(tentativa, tamanho) > largura && linha) {
      page.drawText(linha, { x, y, size: tamanho, font, color: cor })
      y -= lineHeight
      linha = palavra
    } else {
      linha = tentativa
    }
  }
  if (linha) {
    page.drawText(linha, { x, y, size: tamanho, font, color: cor })
    y -= lineHeight
  }
  return y
}

// ── Montagem da peça dobrável (frente + verso unidos) ──────────────────────

// Monta, dentro de `paginaFinal` (do documento `pdfDocFinal`), uma peça
// dobrável completa ancorada em (x, y): frente na metade de cima (y+H a
// y+2H), verso na metade de baixo (y a y+H), linha de dobra tracejada no
// meio e marcas de corte no contorno.
//
// Truque de implementação: cria um PDFDocument TEMPORÁRIO só pra desenhar
// frente e verso como duas páginas CR80 isoladas — reaproveitando
// desenharFrente/desenharVerso sem reescrever layout nenhum — e embute as
// duas como XObjects (embedPage) no documento final. O verso entra rotacionado
// 180°: ao dobrar o cartão na horizontal com a impressão pra fora, a metade
// de baixo gira 180° em torno do eixo da dobra, então se o verso fosse
// desenhado na orientação normal ele sairia de cabeça pra baixo depois de
// dobrado. A rotação do pdf-lib pivota em torno do próprio ponto (x, y)
// informado — por isso o anchor do verso é deslocado em +CARTAO_LARGURA/
// +CARTAO_ALTURA em relação à origem da metade de baixo, senão o resultado
// rotacionado cairia fora da página.
async function desenharCartaoDobravel(
  pdfDocFinal: PDFDocument,
  paginaFinal: PDFPage,
  x: number,
  y: number,
  dados: DadosCartao,
  fotoBaixada: ImagemBaixada | null,
  logoBaixada: ImagemBaixada | null,
  qrBuffer: Uint8Array
) {
  const tempDoc = await PDFDocument.create()
  const fontRegular = await tempDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await tempDoc.embedFont(StandardFonts.HelveticaBold)

  const fotoImg = await embutirImagem(tempDoc, fotoBaixada)
  const logoImg = await embutirImagem(tempDoc, logoBaixada)
  const qrImg = await tempDoc.embedPng(qrBuffer)

  const paginaFrenteTemp = tempDoc.addPage([CARTAO_LARGURA, CARTAO_ALTURA])
  desenharFrente(paginaFrenteTemp, 0, 0, dados, { fotoImg, logoImg, qrImg }, fontRegular, fontBold)

  const paginaVersoTemp = tempDoc.addPage([CARTAO_LARGURA, CARTAO_ALTURA])
  desenharVerso(paginaVersoTemp, 0, 0, dados, fontRegular, fontBold)

  const embeddedFrente = await pdfDocFinal.embedPage(paginaFrenteTemp)
  const embeddedVerso = await pdfDocFinal.embedPage(paginaVersoTemp)

  // Frente — metade de cima, orientação normal.
  paginaFinal.drawPage(embeddedFrente, {
    x,
    y: y + CARTAO_ALTURA,
    width: CARTAO_LARGURA,
    height: CARTAO_ALTURA,
  })

  // Verso — metade de baixo, rotacionado 180° (ver explicação acima).
  paginaFinal.drawPage(embeddedVerso, {
    x: x + CARTAO_LARGURA,
    y: y + CARTAO_ALTURA,
    width: CARTAO_LARGURA,
    height: CARTAO_ALTURA,
    rotate: degrees(180),
  })

  // Linha de dobra tracejada exatamente no meio da peça.
  paginaFinal.drawLine({
    start: { x, y: y + CARTAO_ALTURA },
    end: { x: x + CARTAO_LARGURA, y: y + CARTAO_ALTURA },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
    dashArray: [4, 3],
  })

  desenharMarcasDeCorte(paginaFinal, x, y, CARTAO_LARGURA, CARTAO_DOBRAVEL_ALTURA)
}

// ── API pública ──────────────────────────────────────────────────────────

// Gera o PDF individual — UMA peça dobrável (85,6 × 108 mm = 242,6 × 306,2
// pt), frente em cima e verso embaixo já na orientação certa pra dobrar,
// cortar e plastificar (pedido do Giorgio, 24/07/2026: uma peça só, não mais
// duas páginas separadas).
export async function gerarCartaoCarteirinhaPDF(dados: DadosCartao): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  // Foto, logo e QR baixados/gerados em paralelo — mesmo com 1 cartão só,
  // não há motivo pra serializar 3 operações independentes.
  const [fotoBaixada, logoBaixada, qrBuffer] = await Promise.all([
    baixarImagem(dados.cooperado.fotoUrl),
    baixarImagem(dados.organizacao.logoUrl),
    gerarQrCodePngBuffer(dados.urlVerificacao),
  ])

  const pagina = pdfDoc.addPage([CARTAO_LARGURA, CARTAO_DOBRAVEL_ALTURA])
  await desenharCartaoDobravel(pdfDoc, pagina, 0, 0, dados, fotoBaixada, logoBaixada, qrBuffer)

  return pdfDoc.save()
}

// Gera a folha A4 em lote — grid 2 colunas × 2 linhas (4 peças dobráveis por
// página: 2 × 242,6 = 485,2 pt de largura; 2 × 306,2 = 612,4 pt de altura).
// Cada peça já sai com frente + verso unidos (a mesma peça dobrável da
// impressão individual) — não existe mais a opção "só frente", porque sem o
// verso não há como dobrar e plastificar o cartão.
export async function gerarLoteCarteirinhasPDF(itens: DadosCartao[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  // Downloads de rede (foto de cada cooperado + logo da org) SEMPRE em
  // paralelo via Promise.allSettled — nunca em série dentro do loop de
  // cartões, senão uma única URL pendurada trava o lote inteiro (pegadinha 3
  // do prompt da fase 3). O logo normalmente se repete (mesma org em todo o
  // lote) — cacheado por URL pra não baixar 200 vezes a mesma imagem.
  const fotosResultados = await Promise.allSettled(itens.map(it => baixarImagem(it.cooperado.fotoUrl)))

  const logosUnicas = new Map<string, Promise<ImagemBaixada | null>>()
  for (const it of itens) {
    const url = it.organizacao.logoUrl
    if (url && !logosUnicas.has(url)) logosUnicas.set(url, baixarImagem(url))
  }
  await Promise.allSettled(Array.from(logosUnicas.values()))

  const qrResultados = await Promise.allSettled(itens.map(it => gerarQrCodePngBuffer(it.urlVerificacao)))

  // Cache só do BUFFER do logo (não do PDFImage embutido): cada cartão do
  // lote monta seu próprio documento temporário isolado (ver
  // desenharCartaoDobravel), então o objeto PDFImage embutido não pode ser
  // reaproveitado entre cartões — mas o buffer baixado, sim.
  const logoBufferCache = new Map<string, ImagemBaixada | null>()

  interface CartaoPendente {
    dados: DadosCartao
    fotoBaixada: ImagemBaixada | null
    logoBaixada: ImagemBaixada | null
    qrBuffer: Uint8Array | null
  }
  const cartoes: CartaoPendente[] = []

  for (let i = 0; i < itens.length; i++) {
    const fotoResultado = fotosResultados[i]
    const fotoBaixada = fotoResultado.status === 'fulfilled' ? fotoResultado.value : null

    let logoBaixada: ImagemBaixada | null = null
    const logoUrl = itens[i].organizacao.logoUrl
    if (logoUrl) {
      if (logoBufferCache.has(logoUrl)) {
        logoBaixada = logoBufferCache.get(logoUrl) ?? null
      } else {
        logoBaixada = (await logosUnicas.get(logoUrl)!) ?? null
        logoBufferCache.set(logoUrl, logoBaixada)
      }
    }

    const qrResultado = qrResultados[i]
    const qrBuffer = qrResultado.status === 'fulfilled' ? qrResultado.value : null

    cartoes.push({ dados: itens[i], fotoBaixada, logoBaixada, qrBuffer })
  }

  const PAGINA_LARGURA = 595
  const PAGINA_ALTURA = 842
  const MARGEM = 26
  const COLUNAS = 2
  const LINHAS = 2
  const gapX = COLUNAS > 1 ? (PAGINA_LARGURA - MARGEM * 2 - COLUNAS * CARTAO_LARGURA) / (COLUNAS - 1) : 0
  const gapY = LINHAS > 1 ? (PAGINA_ALTURA - MARGEM * 2 - LINHAS * CARTAO_DOBRAVEL_ALTURA) / (LINHAS - 1) : 0
  const porPagina = COLUNAS * LINHAS
  const totalPaginas = Math.ceil(cartoes.length / porPagina)

  const posicaoDoSlot = (idx: number) => {
    const row = Math.floor(idx / COLUNAS)
    const col = idx % COLUNAS
    return {
      x: MARGEM + col * (CARTAO_LARGURA + gapX),
      y: PAGINA_ALTURA - MARGEM - CARTAO_DOBRAVEL_ALTURA - row * (CARTAO_DOBRAVEL_ALTURA + gapY),
    }
  }

  for (let p = 0; p < totalPaginas; p++) {
    const page = pdfDoc.addPage([PAGINA_LARGURA, PAGINA_ALTURA])
    for (let slot = 0; slot < porPagina; slot++) {
      const globalIdx = p * porPagina + slot
      if (globalIdx >= cartoes.length) break
      const { x, y } = posicaoDoSlot(slot)
      const cartao = cartoes[globalIdx]
      // Sem QR não há como gerar o cartão — defensivo, gerarQrCodePngBuffer
      // não deveria falhar, mas allSettled cobre o caso mesmo assim.
      if (!cartao.qrBuffer) continue
      await desenharCartaoDobravel(pdfDoc, page, x, y, cartao.dados, cartao.fotoBaixada, cartao.logoBaixada, cartao.qrBuffer)
    }
  }

  return pdfDoc.save()
}
