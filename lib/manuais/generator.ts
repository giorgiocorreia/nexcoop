import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'
import { createAdminClient } from '@/lib/supabase/admin'

const COR_CONTABIL = '#0F766E'
const COR_PRIMARY  = '#635BFF'

const A4_W   = 595
const A4_H   = 842
const MARGIN = 50
const CONTENT_W = A4_W - MARGIN * 2

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

async function gerarPDFBuffer(
  titulo: string,
  subtitulo: string,
  secoes: { titulo: string; conteudo: string[] }[],
  corHex: string = COR_PRIMARY,
  versao: string = '1.0',
  ano: number = new Date().getFullYear()
): Promise<Buffer> {
  const pdfDoc  = await PDFDocument.create()
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const [rP, gP, bP] = hexToRgb(corHex)
  const corPrimaria   = rgb(rP, gP, bP)
  const corDark       = rgb(0.102, 0.102, 0.180)  // #1a1a2e
  const corGray       = rgb(0.420, 0.447, 0.502)  // #6b7280
  const corSep        = rgb(0.898, 0.890, 0.863)  // #e5e3dc
  const corWhite      = rgb(1, 1, 1)
  const corAlertBg    = rgb(1.0,  0.984, 0.922)   // #fffbeb
  const corAlertBar   = rgb(0.961, 0.620, 0.043)  // #f59e0b
  const corAlertText  = rgb(0.573, 0.251, 0.055)  // #92400e

  const newPage = (): PDFPage => pdfDoc.addPage([A4_W, A4_H])

  const drawHeaderFooter = (page: PDFPage, pageNum: number) => {
    // Header bar
    page.drawRectangle({ x: 0, y: A4_H - 36, width: A4_W, height: 36, color: corPrimaria })
    page.drawText(`NexCoop — ${titulo}`, {
      x: MARGIN, y: A4_H - 36 + 13, size: 9, font: fontBold, color: corWhite,
    })
    page.drawText(`v${versao} · ${ano}`, {
      x: A4_W - MARGIN - 80, y: A4_H - 36 + 14, size: 8, font, color: corWhite,
    })
    // Footer line
    page.drawLine({
      start: { x: MARGIN, y: 30 }, end: { x: A4_W - MARGIN, y: 30 },
      thickness: 0.5, color: corSep,
    })
    page.drawText('NexCoop · nexcoop.com.br', {
      x: MARGIN, y: 18, size: 7.5, font, color: corGray,
    })
    page.drawText(`Pág. ${pageNum}`, {
      x: A4_W - MARGIN - 50, y: 18, size: 7.5, font, color: corGray,
    })
  }

  // ── CAPA ──────────────────────────────────────────────────────────────────
  const capa = newPage()
  capa.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: corPrimaria })
  capa.drawText('NexCoop', { x: MARGIN, y: A4_H - 120, size: 36, font: fontBold, color: corWhite })
  capa.drawText(titulo, { x: MARGIN, y: A4_H - 170, size: 18, font, color: rgb(0.85, 0.88, 0.92) })
  capa.drawText(subtitulo, { x: MARGIN, y: A4_H - 200, size: 13, font, color: rgb(0.70, 0.73, 0.78) })
  capa.drawText(`Versão ${versao} · ${ano} · nexcoop.com.br`, {
    x: MARGIN, y: 80, size: 10, font, color: rgb(0.60, 0.63, 0.68),
  })

  // ── SEÇÕES ────────────────────────────────────────────────────────────────
  let pageNum = 1

  const ensurePage = (page: PDFPage, y: number): [PDFPage, number] => {
    if (A4_H - y < 80) {
      const p = newPage(); pageNum++; drawHeaderFooter(p, pageNum); return [p, 55]
    }
    return [page, y]
  }

  for (const secao of secoes) {
    let page = newPage()
    pageNum++
    drawHeaderFooter(page, pageNum)
    let y = 55

    // Section title bar
    page.drawRectangle({ x: MARGIN, y: A4_H - y - 32, width: CONTENT_W, height: 32, color: corDark })
    page.drawText(secao.titulo, {
      x: MARGIN + 12, y: A4_H - y - 32 + 9, size: 12, font: fontBold, color: corWhite,
      maxWidth: CONTENT_W - 24,
    })
    y += 44

    for (const paragrafo of secoes[0] === secao ? secao.conteudo : secao.conteudo) {
      ;[page, y] = ensurePage(page, y)

      if (paragrafo.startsWith('##')) {
        // Subtítulo
        y += 8
        ;[page, y] = ensurePage(page, y)
        const sub = paragrafo.replace('## ', '')
        page.drawText(sub, {
          x: MARGIN, y: A4_H - y - 11, size: 11, font: fontBold, color: corPrimaria,
          maxWidth: CONTENT_W,
        })
        y += 18
        page.drawLine({ start: { x: MARGIN, y: A4_H - y }, end: { x: A4_W - MARGIN, y: A4_H - y }, thickness: 0.5, color: corSep })
        y += 8

      } else if (paragrafo.startsWith('•')) {
        // Bullet
        const bulletText = paragrafo.replace('• ', '')
        const lines = wrapText(bulletText, font, 10, CONTENT_W - 20)
        page.drawText('•', { x: MARGIN + 8, y: A4_H - y - 10, size: 10, font: fontBold, color: corPrimaria })
        for (let i = 0; i < lines.length; i++) {
          ;[page, y] = ensurePage(page, y)
          page.drawText(lines[i], { x: MARGIN + 20, y: A4_H - y - 10, size: 10, font, color: corDark })
          y += 14
        }
        y += 3

      } else if (paragrafo.startsWith('⚠')) {
        // Alerta
        y += 4
        const alertLines = wrapText(paragrafo, font, 9, CONTENT_W - 20)
        const alertH = Math.max(36, alertLines.length * 13 + 16)
        ;[page, y] = ensurePage(page, y)
        page.drawRectangle({ x: MARGIN, y: A4_H - y - alertH, width: CONTENT_W, height: alertH, color: corAlertBg })
        page.drawRectangle({ x: MARGIN, y: A4_H - y - alertH, width: 3, height: alertH, color: corAlertBar })
        let ay = y + 8
        for (const line of alertLines) {
          page.drawText(line, { x: MARGIN + 12, y: A4_H - ay - 9, size: 9, font, color: corAlertText })
          ay += 13
        }
        y += alertH + 8

      } else if (paragrafo === '---') {
        // Separador
        y += 6
        page.drawLine({ start: { x: MARGIN, y: A4_H - y }, end: { x: A4_W - MARGIN, y: A4_H - y }, thickness: 0.5, color: corSep })
        y += 10

      } else if (paragrafo.trim() !== '') {
        // Parágrafo normal com quebra de linha
        const lines = wrapText(paragrafo, font, 10, CONTENT_W)
        for (const line of lines) {
          ;[page, y] = ensurePage(page, y)
          page.drawText(line, { x: MARGIN, y: A4_H - y - 10, size: 10, font, color: corDark })
          y += 14
        }
        y += 6
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

// ── UPLOAD + PERSISTÊNCIA ─────────────────────────────────────────────────────

async function uploadManual(buffer: Buffer, nomeArquivo: string): Promise<string> {
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from('manuais')
    .upload(nomeArquivo, buffer, { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error(`Erro no upload: ${error.message}`)
  const { data: urlData } = supabase.storage.from('manuais').getPublicUrl(nomeArquivo)
  return urlData.publicUrl
}

async function salvarUrlManual(chave: string, url: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('configuracoes_sistema')
    .update({ valor: url, updated_at: new Date().toISOString() })
    .eq('chave', chave)
  if (error) throw new Error(error.message)
}

// ── MANUAL CONTÁBIL ───────────────────────────────────────────────────────────

export async function gerarManualContabil(): Promise<string> {
  const secoes = [
    {
      titulo: '1. Visão Geral do Módulo Contábil',
      conteudo: [
        'O Módulo Contábil do NexCoop oferece escrituração contábil completa integrada à gestão operacional da cooperativa ou associação.',
        'Diferente de sistemas genéricos, o NexCoop foi construído com os conceitos legais e contábeis do cooperativismo brasileiro como base.',
        '## Funcionalidades incluídas',
        '• Plano de Contas hierárquico configurável (padrão NBC TG 1000)',
        '• Escrituração em partidas dobradas',
        '• Balancete mensal com drill-down',
        '• DRE — Demonstrativo de Resultado do Exercício',
        '• Balanço Patrimonial com verificação de equilíbrio',
        '• Livro Razão por conta e período',
        '• Livro Diário cronológico',
        '• Sobras/Superávit e destinações obrigatórias',
        '• Fechamento de exercício com hash SHA-256',
        '• De/Para entre planos de contas',
        '• Importação de NF-e via XML',
        '• Exportação SPED ECD auxiliar',
        '⚠ Posicionamento: o NexCoop não substitui o sistema contábil do escritório. Ele organiza os dados para que o contador trabalhe com eficiência.',
      ],
    },
    {
      titulo: '2. Perfis de Acesso',
      conteudo: [
        '## Administrador da Organização',
        '• Acesso completo ao módulo contábil',
        '• Configura plano de contas e percentuais de destinação',
        '• Importa NF-e e visualiza todos os relatórios',
        '• Pode fechar o exercício (recomendado que seja feito pelo contador)',
        '• Gerencia o vínculo com o escritório de contabilidade',
        '---',
        '## Contador / Auxiliar Contábil',
        '• Acesso exclusivo à seção CONTÁBIL e ESCRITÓRIO',
        '• Classifica lançamentos financeiros nas contas contábeis',
        '• Consulta relatórios, faz De/Para, exporta SPED ECD',
        '• Fecha o exercício com CRC registrado',
        '• Não vê dados operacionais da organização',
        '---',
        'O contador é vinculado pela organização em Configurações → Contador. Ao inativar, o acesso é removido imediatamente.',
      ],
    },
    {
      titulo: '3. Plano de Contas',
      conteudo: [
        'O plano de contas é a estrutura hierárquica que organiza todas as contas contábeis da organização.',
        '## Como carregar o plano padrão',
        '• Acesse CONTÁBIL → Plano de Contas',
        '• Clique em "+ Carregar Plano Padrão" (cooperativa ou associação)',
        '• O sistema insere automaticamente a estrutura completa',
        '• Use "+ Nova Conta" para adicionar contas específicas',
        '---',
        '## Estrutura do plano (cooperativa)',
        '• 1. ATIVO — Circulante e Não Circulante',
        '• 2. PASSIVO — Circulante e Não Circulante',
        '• 3. PATRIMÔNIO LÍQUIDO — Capital, Reservas (REFAC, Fundo de Reserva), Sobras',
        '• 4. RECEITAS — Ato Cooperativo e Não-Cooperativo',
        '• 5. DESPESAS — Operacionais e Administrativas',
        '---',
        '## Estrutura do plano (associação)',
        '• 1. ATIVO — Circulante e Não Circulante',
        '• 2. PASSIVO — Circulante',
        '• 3. PATRIMÔNIO SOCIAL — Fundo Social, Reservas, Superávit/Déficit',
        '• 4. RECEITAS — Contribuições, Doações, Projetos',
        '• 5. DESPESAS — Administrativas, Projetos',
      ],
    },
    {
      titulo: '4. Escrituração',
      conteudo: [
        'A escrituração classifica cada lançamento financeiro em uma partida dobrada — conta a débito e conta a crédito.',
        '## Fluxo de classificação',
        '• 1. Lançamento registrado no módulo Financeiro',
        '• 2. Aparece na aba "Pendentes" da Escrituração',
        '• 3. Contador seleciona débito e crédito no plano de contas',
        '• 4. Partida gerada e vinculada ao lançamento original',
        '• 5. Relatórios atualizados automaticamente',
        'Lançamentos classificados são imutáveis para fins de auditoria.',
      ],
    },
    {
      titulo: '5. Relatórios Contábeis',
      conteudo: [
        '## Balancete',
        'Saldos por conta no período: saldo anterior, débitos, créditos e saldo atual. Selecione mês e ano no topo da página.',
        '---',
        '## DRE — Demonstrativo de Resultado',
        'Receitas e despesas do exercício com resultado final. Para cooperativas: Sobras ou Perdas. Para associações: Superávit ou Déficit.',
        '---',
        '## Balanço Patrimonial',
        'Posição patrimonial em duas colunas: Ativo × Passivo + Patrimônio Líquido. Banner verde = equilibrado. Banner vermelho = diferença identificada.',
        '---',
        '## Livro Razão',
        'Movimentações de uma conta específica no período, com saldo progressivo linha a linha.',
        '---',
        '## Livro Diário',
        'Registro cronológico e numerado de todos os lançamentos do exercício. Botão "Imprimir" disponível.',
      ],
    },
    {
      titulo: '6. Sobras, REFAC e Fechamento',
      conteudo: [
        '## Cooperativas — Sobras e REFAC',
        '• Fundo de Reserva: mínimo 10% das sobras líquidas (Lei 5.764/71)',
        '• REFAC: Reserva de Assistência Técnica, Educacional e Social',
        '• Sobras distribuíveis: restante após destinações obrigatórias',
        '• Distribuição por cooperado: calculada automaticamente após fechamento',
        '---',
        '## Associações — Superávit e Destinações',
        '• Fundo de Reserva e REFAC são opcionais (conforme estatuto)',
        '• Resultado não é distribuído aos associados',
        '• Superávit é incorporado ao Patrimônio Social',
        '---',
        '## Fechamento de Exercício',
        '⚠ O fechamento é irreversível. Certifique-se de que todos os lançamentos foram classificados antes de prosseguir.',
        '• Gera hash SHA-256 com todos os valores e identificação do responsável',
        '• Registra CRC do contador quando feito pelo contador',
        '• Encerra o exercício — não pode ser reaberto',
      ],
    },
    {
      titulo: '7. De/Para e Exportações',
      conteudo: [
        '## De/Para — Plano de Contas',
        'Resolve o problema de inconsistência entre o plano do NexCoop e o plano do escritório de contabilidade.',
        '• Contador cadastra seu plano uma vez em Escritório → Plano de Contas',
        '• Org mapeia cada conta NexCoop para a conta correspondente do escritório',
        '• Exportações já saem com os códigos do escritório automaticamente',
        '---',
        '## Exportações disponíveis',
        '• SPED ECD (.txt) — arquivo auxiliar para a Receita Federal',
        '• Balancete, DRE, Balanço Patrimonial — PDF/Impressão',
        '• Livro Diário, Livro Razão — PDF/Impressão',
        '⚠ O SPED ECD gerado é auxiliar. Deve ser validado pelo contador no programa SPED do governo antes da entrega oficial.',
      ],
    },
    {
      titulo: '8. NF-e e Portal do Contador',
      conteudo: [
        '## Importação de NF-e',
        '• Acesse CONTÁBIL → NF-e',
        '• Clique em "+ Importar XML(s)" — aceita múltiplos arquivos',
        '• O sistema extrai: emitente, destinatário, valor, ICMS, PIS, COFINS e itens',
        '• Use "Ver" para detalhar, "Ignorar" para notas irrelevantes',
        'Suporta NF-e padrão SEFAZ versão 4.0. NFS-e e CT-e não suportados.',
        '---',
        '## Portal do Contador',
        '• Contador cria conta no NexCoop com e-mail profissional',
        '• Organização convida em Configurações → Contador',
        '• Contador vê apenas seções CONTÁBIL e ESCRITÓRIO',
        '• Inativar remove o acesso imediatamente sem excluir histórico',
        '• Um contador pode atender múltiplas organizações no mesmo login',
      ],
    },
  ]

  const buffer = await gerarPDFBuffer(
    'Manual do Módulo Contábil',
    'Guia completo para administradores e contadores',
    secoes, COR_CONTABIL, '1.0', new Date().getFullYear()
  )
  const url = await uploadManual(buffer, 'manual-contabil.pdf')
  await salvarUrlManual('manual_contabil_url', url)
  return url
}

// ── MANUAL FINANCEIRO ─────────────────────────────────────────────────────────

export async function gerarManualFinanceiro(): Promise<string> {
  const secoes = [
    {
      titulo: '1. Visão Geral do Módulo Financeiro',
      conteudo: [
        'O Módulo Financeiro centraliza o controle de entradas e saídas da organização, com categorização, relatórios e integração com o módulo contábil.',
        '## Funcionalidades',
        '• Registro de lançamentos (receitas, despesas e transferências)',
        '• Status de pagamento: pendente, pago, agendado, cancelado',
        '• Filtros por mês, tipo e status',
        '• Vinculação com cooperados',
        '• Integração automática com a Escrituração Contábil',
      ],
    },
    {
      titulo: '2. Registrando Lançamentos',
      conteudo: [
        '## Como registrar uma entrada',
        '• Acesse PRINCIPAL → Financeiro',
        '• Clique em "+ Novo Lançamento"',
        '• Selecione tipo: Receita',
        '• Informe data, valor, descrição e categoria',
        '• Salve — o lançamento aparece automaticamente na Escrituração para classificação contábil',
        '---',
        '## Como registrar uma saída',
        '• Mesmo processo, selecione tipo: Despesa',
        '• Informe o fornecedor ou beneficiário quando aplicável',
        '⚠ Lançamentos registrados no Financeiro são a base da escrituração contábil. Certifique-se de preencher a descrição com clareza para facilitar a classificação pelo contador.',
        '---',
        '## Status dos lançamentos',
        '• Pendente — ainda não pago/recebido',
        '• Pago — quitado',
        '• Agendado — data futura',
        '• Cancelado — estornado ou descartado',
      ],
    },
    {
      titulo: '3. Filtros e Relatórios',
      conteudo: [
        'A tela principal do Financeiro exibe totais calculados sobre os lançamentos filtrados.',
        '## Cards de resumo',
        '• Receitas — total de entradas do período',
        '• Despesas — total de saídas do período',
        '• Saldo — diferença entre receitas e despesas',
        '• Pendentes — valores ainda não quitados',
        '---',
        '## Filtros disponíveis',
        '• Mês/ano de competência',
        '• Tipo (receita, despesa, transferência)',
        '• Status (pendente, pago, agendado, cancelado)',
        '• Busca por descrição',
        'Os totais nos cards refletem apenas os lançamentos visíveis após os filtros.',
      ],
    },
  ]

  const buffer = await gerarPDFBuffer(
    'Manual do Módulo Financeiro',
    'Guia de registro e controle de lançamentos',
    secoes, COR_PRIMARY, '1.0', new Date().getFullYear()
  )
  const url = await uploadManual(buffer, 'manual-financeiro.pdf')
  await salvarUrlManual('manual_financeiro_url', url)
  return url
}

// ── TODOS OS MANUAIS ──────────────────────────────────────────────────────────

export async function gerarTodosManuais(): Promise<Record<string, string>> {
  const urls: Record<string, string> = {}
  urls.contabil   = await gerarManualContabil()
  urls.financeiro = await gerarManualFinanceiro()
  return urls
}
