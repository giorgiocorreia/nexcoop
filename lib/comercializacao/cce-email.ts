// lib/comercializacao/cce-email.ts
// Envia a Carta de Correção Eletrônica (PDF + XML) por e-mail ao comprador.
//
// Os arquivos não ficam no nosso storage: a Focus hospeda e serve as URLs
// gravadas em nfe_eventos. Aqui elas são baixadas na hora e anexadas.

import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail, smtpConfigured, formatSmtpError } from '@/lib/email'

/** Baixa um anexo da Focus. As URLs de CC-e são públicas (sem token). */
async function baixarAnexo(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Não foi possível baixar ${filename} (HTTP ${res.status}).`)
  }
  return { filename, content: Buffer.from(await res.arrayBuffer()) }
}

export async function enviarCartaCorrecaoEmail(params: {
  eventoId: string
  organizacaoId: string
  emailOverride?: string
}): Promise<{ sucesso: boolean; erro?: string; email?: string }> {
  const supabase = createAdminClient()

  const { data: evento } = await supabase
    .from('nfe_eventos')
    .select('id, venda_id, sequencia, texto, status, xml_url, pdf_url, chave_nfe')
    .eq('id', params.eventoId)
    .eq('organizacao_id', params.organizacaoId)
    .maybeSingle()

  if (!evento) return { sucesso: false, erro: 'Carta de correção não encontrada.' }
  if (evento.status !== 'registrado') {
    return { sucesso: false, erro: 'Só é possível enviar carta registrada na SEFAZ.' }
  }
  if (!evento.pdf_url && !evento.xml_url) {
    return { sucesso: false, erro: 'Esta carta não tem PDF nem XML disponíveis.' }
  }

  const { data: venda } = await supabase
    .from('vendas_externas')
    .select('numero_nfe, serie_nfe, compradores(nome, email)')
    .eq('id', evento.venda_id)
    .maybeSingle()

  const comprador: any = Array.isArray((venda as any)?.compradores)
    ? (venda as any).compradores[0]
    : (venda as any)?.compradores

  const destinatario = (params.emailOverride?.trim() || comprador?.email || '').trim()
  if (!destinatario || !destinatario.includes('@')) {
    return { sucesso: false, erro: 'E-mail do destinatário inválido' }
  }

  if (!smtpConfigured()) {
    return {
      sucesso: false,
      erro: 'SMTP não configurado no servidor (SMTP_USER / SMTP_PASS). O download dos arquivos continua funcionando.',
    }
  }

  const { data: org } = await supabase
    .from('organizacoes')
    .select('nome')
    .eq('id', params.organizacaoId)
    .single()

  const nomeOrg = org?.nome ?? 'NexCoop'
  const numeroNota = venda?.numero_nfe ? `${venda.numero_nfe}/${venda.serie_nfe ?? ''}` : '—'
  const seq = evento.sequencia ?? 1
  const dataHoje = new Date().toLocaleDateString('pt-BR')
  const sufixo = `${String(seq).padStart(2, '0')}`

  try {
    const anexos = []
    if (evento.pdf_url) {
      anexos.push(await baixarAnexo(evento.pdf_url, `cce_${venda?.numero_nfe ?? 'nfe'}_${sufixo}.pdf`))
    }
    if (evento.xml_url) {
      anexos.push(await baixarAnexo(evento.xml_url, `cce_${venda?.numero_nfe ?? 'nfe'}_${sufixo}.xml`))
    }

    await enviarEmail({
      to: destinatario,
      subject: `${nomeOrg} — Carta de Correção Eletrônica — NF-e ${numeroNota}`,
      html: `
        <h2>${nomeOrg} — Carta de Correção Eletrônica</h2>
        <p><strong>NF-e:</strong> ${numeroNota}</p>
        <p><strong>Chave de acesso:</strong> ${evento.chave_nfe ?? '—'}</p>
        <p><strong>Carta nº:</strong> ${seq}</p>
        <p><strong>Data:</strong> ${dataHoje}</p>
        <p><strong>Texto da correção:</strong></p>
        <blockquote style="border-left:3px solid #ccc;margin:0;padding-left:12px;color:#444">
          ${evento.texto}
        </blockquote>
        <p>Seguem em anexo o PDF e o XML da carta, registrados na SEFAZ.</p>
        <p>Atenciosamente,<br/><strong>${nomeOrg}</strong></p>
      `,
      attachments: anexos,
    })

    return { sucesso: true, email: destinatario }
  } catch (e: any) {
    console.error('[cce-email]', e)
    return {
      sucesso: false,
      erro: formatSmtpError(e) || e?.message || 'Erro ao enviar a carta por e-mail',
    }
  }
}
