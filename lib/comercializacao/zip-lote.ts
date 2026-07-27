'use server'

import JSZip from 'jszip'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail, smtpConfigured, formatSmtpError } from '@/lib/email'
import { getFocusAuthHeader, getFocusConfig } from '@/lib/focusnfe/client'

/** Normaliza chave para 44 dígitos (remove prefixo NFe). */
function chave44(chave: string | null | undefined): string | null {
  if (!chave) return null
  const digits = chave.replace(/\D/g, '')
  return digits.length >= 44 ? digits.slice(-44) : digits || null
}

function ambienteComercializacao(): 'producao' | 'homologacao' {
  try {
    return getFocusConfig('comercializacao').ambiente
  } catch {
    const env = process.env.FOCUSNFE_AMBIENTE_COMERCIALIZACAO ?? process.env.FOCUSNFE_AMBIENTE
    return env === 'producao' ? 'producao' : 'homologacao'
  }
}

function focusBaseUrl(): string {
  return ambienteComercializacao() === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br'
}

function getEmailDestinatario(emailComprador: string | null): string {
  if (ambienteComercializacao() === 'producao' && emailComprador) {
    return emailComprador
  }
  return 'gio.pessoal@gmail.com'
}

function authHeaderOpcional(): Record<string, string> {
  try {
    return { Authorization: getFocusAuthHeader('comercializacao') }
  } catch {
    return {}
  }
}

async function baixarArquivo(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: authHeaderOpcional() })
  if (!res.ok) throw new Error(`Erro ao baixar arquivo (${res.status}): ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Monta URL do XML no padrão Focus a partir da chave de 44 dígitos. */
function construirXmlUrl(chaveRaw: string): string {
  const chave = chave44(chaveRaw) ?? chaveRaw.replace(/\D/g, '')
  // AAMM na chave (posições 2-5 zero-based: YYMM após cUF)
  const yy = chave.slice(2, 4)
  const mm = chave.slice(4, 6)
  const pastaAnoMes = `20${yy}${mm}` // ex.: 202607
  const cnpj = '54305114000179'
  const base = focusBaseUrl()
  const pastaAmbiente = ambienteComercializacao() === 'producao' ? '' : '_development'
  return `${base}/arquivos${pastaAmbiente}/${cnpj}_222056/${pastaAnoMes}/XMLs/${chave}-nfe.xml`
}

function danfeUrlFromXml(xmlUrl: string): string {
  // Padrão real Focus: .../XMLs/CHAVE-nfe.xml → .../DANFEs/CHAVE-nfe.pdf
  return xmlUrl.replace('/XMLs/', '/DANFEs/').replace(/-nfe\.xml$/i, '-nfe.pdf')
}

function nomeArquivoSeguro(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

async function montarZipLote(loteId: string): Promise<{
  zipBuffer: Buffer
  lote: { id: string; codigo: string; produto_descricao: string | null; organizacao_id: string }
  nomeOrg: string
  compradorEmail: string | null
  arquivosIncluidos: number
}> {
  const supabase = createAdminClient()

  const { data: lote, error: loteErr } = await supabase
    .from('lotes')
    .select('id, codigo, produto_descricao, organizacao_id')
    .eq('id', loteId)
    .single()

  if (loteErr || !lote) throw new Error(loteErr?.message ?? 'Lote não encontrado')

  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome, nome_curto')
    .eq('id', lote.organizacao_id)
    .single()

  const nomeOrg = (org as any)?.nome_curto ?? org?.nome ?? 'Cooperativa'

  const { data: movs } = await supabase
    .from('movimentacoes_conta')
    .select('id')
    .eq('lote_id', loteId)

  const movIds = movs?.map(m => m.id) ?? []

  // status pode ser 'autorizada' ou legado 'emitida'
  const { data: notasEntrada } = movIds.length > 0
    ? await supabase
        .from('notas_entrega')
        .select(`
          id, chave_nfe, numero_nfe, xml_url, quantidade_kg, valor_unitario, valor_total, status,
          produtores(nome, cpf, telefone, municipio, endereco)
        `)
        .eq('organizacao_id', lote.organizacao_id)
        .in('movimentacao_id', movIds)
        .in('status', ['autorizada', 'emitida'])
    : { data: [] as any[] }

  const { data: venda } = await supabase
    .from('vendas_externas')
    .select(`
      id, chave_nfe, numero_nfe, xml_nfe,
      compradores(nome, email)
    `)
    .eq('lote_id', loteId)
    .eq('status_nfe', 'autorizada')
    .maybeSingle()

  const zip = new JSZip()
  const entradas = zip.folder('entradas')!
  const saida = zip.folder('saida')!
  let arquivosIncluidos = 0

  for (const nota of notasEntrada ?? []) {
    const chave = chave44(nota.chave_nfe) ?? nota.chave_nfe
    if (!chave) continue
    const produtor = Array.isArray((nota as any).produtores)
      ? (nota as any).produtores[0]
      : (nota as any).produtores
    const nomeArquivo = nomeArquivoSeguro(`NF${nota.numero_nfe ?? ''}_${produtor?.nome ?? 'produtor'}`)
    const xmlUrl = (nota as any).xml_url || construirXmlUrl(String(chave))
    try {
      const xmlBuffer = await baixarArquivo(xmlUrl)
      entradas.file(`${nomeArquivo}.xml`, xmlBuffer)
      arquivosIncluidos++
    } catch (e) {
      console.warn('[zip-lote] XML entrada falhou:', xmlUrl, e)
    }
  }

  if (venda?.chave_nfe || venda?.xml_nfe) {
    const comprador = Array.isArray((venda as any).compradores)
      ? (venda as any).compradores[0]
      : (venda as any).compradores
    const nomeSaida = nomeArquivoSeguro(`NF${venda.numero_nfe ?? ''}_${comprador?.nome ?? 'comprador'}`)
    const xmlUrl = venda.xml_nfe || (venda.chave_nfe ? construirXmlUrl(venda.chave_nfe) : null)

    if (xmlUrl) {
      try {
        const xmlSaida = await baixarArquivo(xmlUrl)
        saida.file(`${nomeSaida}.xml`, xmlSaida)
        arquivosIncluidos++

        const danfeUrl = danfeUrlFromXml(xmlUrl)
        try {
          const danfeBuffer = await baixarArquivo(danfeUrl)
          saida.file(`${nomeSaida}.pdf`, danfeBuffer)
          arquivosIncluidos++
        } catch (e) {
          console.warn('[zip-lote] DANFE saída falhou:', danfeUrl, e)
        }
      } catch (e) {
        console.warn('[zip-lote] XML saída falhou:', xmlUrl, e)
      }
    }
  }

  const linhasCSV = ['Nome,CPF,Telefone,Endereco,Municipio,Kg,Valor Total']
  for (const nota of notasEntrada ?? []) {
    const p = Array.isArray((nota as any).produtores)
      ? (nota as any).produtores[0]
      : (nota as any).produtores
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    linhasCSV.push([
      esc(p?.nome),
      esc(p?.cpf),
      esc(p?.telefone),
      esc(p?.endereco),
      esc(p?.municipio),
      esc((nota as any).quantidade_kg),
      esc((nota as any).valor_total),
    ].join(','))
  }
  zip.file('cooperados.csv', linhasCSV.join('\n'))
  arquivosIncluidos++

  const zipBuffer = Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }))
  const compradorEmail = (() => {
    const c = (venda as any)?.compradores
    const comp = Array.isArray(c) ? c[0] : c
    return (comp?.email as string | null) ?? null
  })()

  return {
    zipBuffer,
    lote: lote as any,
    nomeOrg,
    compradorEmail,
    arquivosIncluidos,
  }
}

/** Só gera o ZIP (download). Não envia e-mail. */
export async function gerarZipLote(loteId: string): Promise<{
  sucesso: boolean
  erro?: string
  zipBase64?: string
  codigoLote?: string
}> {
  try {
    const { zipBuffer, lote } = await montarZipLote(loteId)
    return {
      sucesso: true,
      zipBase64: zipBuffer.toString('base64'),
      codigoLote: lote.codigo,
    }
  } catch (e: any) {
    console.error('[zip-lote] gerarZipLote:', e)
    return { sucesso: false, erro: e?.message ?? 'Erro ao gerar ZIP do lote' }
  }
}

/**
 * Gera ZIP e envia por e-mail.
 * `emailOverride` tem prioridade (campo do modal).
 * Não devolve o ZIP em base64 no sucesso do e-mail (evita payload enorme na server action).
 */
export async function gerarZipEEnviarEmail(
  loteId: string,
  emailOverride?: string
): Promise<{ sucesso: boolean; erro?: string; email?: string }> {
  try {
    const { zipBuffer, lote, nomeOrg, compradorEmail } = await montarZipLote(loteId)

    const emailDestinatario = (emailOverride?.trim() || getEmailDestinatario(compradorEmail))
    if (!emailDestinatario || !emailDestinatario.includes('@')) {
      return { sucesso: false, erro: 'E-mail do destinatário inválido' }
    }

    if (!smtpConfigured()) {
      return {
        sucesso: false,
        erro: 'SMTP não configurado no servidor (SMTP_USER / SMTP_PASS). O download do ZIP ainda funciona.',
      }
    }

    const dataHoje = new Date().toLocaleDateString('pt-BR')
    const nomeLote = `Lote ${lote.codigo}`

    await enviarEmail({
      to: emailDestinatario,
      subject: `${nomeOrg} — Documentos Fiscais — Lote ${lote.codigo} — ${dataHoje}`,
      html: `
        <h2>${nomeOrg} — Documentos Fiscais</h2>
        <p><strong>Lote:</strong> ${nomeLote}</p>
        <p><strong>Produto:</strong> ${lote.produto_descricao ?? 'Multi-produto'}</p>
        <p><strong>Data:</strong> ${dataHoje}</p>
        <p>Segue em anexo o pacote ZIP contendo:</p>
        <ul>
          <li>XMLs das NF-e de entrada (por produtor)</li>
          <li>XML + DANFE da NF-e de saída</li>
          <li>Lista de cooperados (CSV)</li>
        </ul>
        <p>Atenciosamente,<br/><strong>${nomeOrg}</strong></p>
      `,
      attachments: [
        {
          filename: `lote_${lote.codigo}_${dataHoje.replace(/\//g, '')}.zip`,
          content: zipBuffer,
        },
      ],
    })

    return { sucesso: true, email: emailDestinatario }
  } catch (e: any) {
    console.error('[zip-lote] gerarZipEEnviarEmail:', e)
    return {
      sucesso: false,
      erro: formatSmtpError(e) || e?.message || 'Erro ao enviar documentos por e-mail',
    }
  }
}
