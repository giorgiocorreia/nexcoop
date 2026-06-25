'use server'

import JSZip from 'jszip'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail } from '@/lib/email'

function getFocusBaseUrl() {
  return process.env.FOCUSNFE_AMBIENTE === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br'
}

function getFocusToken() {
  return process.env.FOCUSNFE_AMBIENTE === 'producao'
    ? process.env.FOCUSNFE_TOKEN_PRODUCAO!
    : process.env.FOCUSNFE_TOKEN_HOMOLOGACAO!
}

function getEmailDestinatario(emailComprador: string | null): string {
  if (process.env.FOCUSNFE_AMBIENTE === 'producao' && emailComprador) {
    return emailComprador
  }
  return 'gio.pessoal@gmail.com'
}

async function baixarArquivo(url: string): Promise<Buffer> {
  const token = getFocusToken()
  const auth = Buffer.from(`${token}:`).toString('base64')
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) throw new Error(`Erro ao baixar ${url}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function construirXmlUrl(chave: string): string {
  const base = getFocusBaseUrl()
  const anoMes = `${chave.slice(2, 4)}${chave.slice(4, 6)}`
  const cnpj = '54305114000179'
  return `${base}/arquivos${process.env.FOCUSNFE_AMBIENTE === 'producao' ? '' : '_development'}/${cnpj}_222056/${anoMes === '2606' ? '202606' : anoMes}/XMLs/${chave}-nfe.xml`
}

export async function gerarZipEEnviarEmail(loteId: string): Promise<{ sucesso: boolean; erro?: string; zipBase64?: string }> {
  const supabase = createAdminClient()

  // 1. Buscar lote
  const { data: lote } = await supabase
    .from('lotes')
    .select('id, codigo, produto_descricao, organizacao_id')
    .eq('id', loteId)
    .single()

  if (!lote) return { sucesso: false, erro: 'Lote não encontrado' }

  // 1b. Buscar nome da organização
  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome, nome_curto')
    .eq('id', lote.organizacao_id)
    .single()

  const nomeOrg = org?.nome_curto ?? org?.nome ?? 'Cooperativa'

  // 2. IDs das movimentações do lote
  const { data: movs } = await supabase
    .from('movimentacoes_conta')
    .select('id')
    .eq('lote_id', loteId)

  const movIds = movs?.map(m => m.id) ?? []

  // 3. Buscar notas de entrada autorizadas
  const { data: notasEntrada } = movIds.length > 0 ? await supabase
    .from('notas_entrega')
    .select(`
      id, chave_nfe, numero_nfe, xml_url, quantidade_kg, valor_unitario, valor_total,
      produtores(nome, cpf, telefone, municipio, endereco)
    `)
    .eq('organizacao_id', lote.organizacao_id)
    .in('movimentacao_id', movIds)
    .eq('status', 'autorizada') : { data: [] }

  // 4. Buscar nota de saída autorizada
  const { data: venda } = await supabase
    .from('vendas_externas')
    .select(`
      id, chave_nfe, numero_nfe, xml_nfe,
      compradores(nome, email)
    `)
    .eq('lote_id', loteId)
    .eq('status_nfe', 'autorizada')
    .maybeSingle()

  // 5. Montar ZIP
  const zip = new JSZip()
  const entradas = zip.folder('entradas')!
  const saida = zip.folder('saida')!

  // XMLs de entrada
  for (const nota of notasEntrada ?? []) {
    if (!nota.chave_nfe) continue
    const produtor = (nota as any).produtores
    const nomeArquivo = `NF${nota.numero_nfe}_${(produtor?.nome ?? 'produtor').replace(/\s+/g, '_')}`
    const xmlUrl = (nota as any).xml_url || construirXmlUrl(nota.chave_nfe)
    try {
      const xmlBuffer = await baixarArquivo(xmlUrl)
      entradas.file(`${nomeArquivo}.xml`, xmlBuffer)
    } catch {}
  }

  // XML + DANFE de saída
  if (venda?.xml_nfe && venda?.chave_nfe) {
    try {
      const xmlSaida = await baixarArquivo(venda.xml_nfe)
      const comprador = (venda as any).compradores
      const nomeSaida = `NF${venda.numero_nfe}_${(comprador?.nome ?? 'comprador').replace(/\s+/g, '_')}`
      saida.file(`${nomeSaida}.xml`, xmlSaida)

      const danfeUrl = venda.xml_nfe.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '.pdf')
      try {
        const danfeBuffer = await baixarArquivo(danfeUrl)
        saida.file(`${nomeSaida}.pdf`, danfeBuffer)
      } catch {}
    } catch {}
  }

  // CSV de cooperados
  const linhasCSV = ['Nome,CPF,Telefone,Endereço,Município,Kg,Valor Total']
  for (const nota of notasEntrada ?? []) {
    const p = (nota as any).produtores
    linhasCSV.push([
      p?.nome ?? '',
      p?.cpf ?? '',
      p?.telefone ?? '',
      p?.endereco ?? '',
      p?.municipio ?? '',
      (nota as any).quantidade_kg ?? '',
      (nota as any).valor_total ?? '',
    ].join(','))
  }
  zip.file('cooperados.csv', linhasCSV.join('\n'))

  // 6. Gerar ZIP
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const zipBase64 = zipBuffer.toString('base64')

  // 7. Enviar email
  const comprador = (venda as any)?.compradores
  const emailDestinatario = getEmailDestinatario(comprador?.email ?? null)
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

  return { sucesso: true, zipBase64 }
}
