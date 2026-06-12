'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { emitirNfeEntrada, consultarNfeEntrada } from '@/lib/focusnfe/emitir-nfe-entrada'

export async function emitirNfeEntradaAction(movimentacao_id: string) {
  const usuario = await getUsuarioLogado()
  const resultado = await emitirNfeEntrada({
    movimentacao_id,
    organizacao_id: usuario.organizacao_id as string,
  })
  return resultado
}

// Helper: monta URL completa para XML/DANFE retornados como path relativo
function urlCompleta(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  const base = process.env.FOCUSNFE_AMBIENTE === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br'
  return `${base}${path}`
}

export async function getNfeStatus(movimentacao_id: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('notas_entrega')
    .select('id, status, chave_nfe, numero_nfe, danfe_url, motivo_rejeicao, referencia')
    .eq('movimentacao_id', movimentacao_id)
    .neq('status', 'cancelada')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return data

  // Se ainda está "processando" localmente, consulta a Focus para ver se já autorizou
  if (data.status === 'processando' && data.referencia) {
    try {
      const resposta = await consultarNfeEntrada(data.referencia)

      if (resposta.status === 'autorizado') {
        const danfe_url = urlCompleta(resposta.caminho_danfe)
        const xml_url = urlCompleta(resposta.caminho_xml_nota_fiscal)

        await supabase
          .from('notas_entrega')
          .update({
            status: 'autorizada',
            chave_nfe: resposta.chave_nfe,
            numero_nfe: resposta.numero,
            xml_url,
            danfe_url,
            emitido_em: new Date().toISOString(),
          })
          .eq('id', data.id)

        return {
          ...data,
          status: 'autorizada',
          chave_nfe: resposta.chave_nfe ?? null,
          numero_nfe: resposta.numero ?? null,
          danfe_url: danfe_url ?? null,
        }
      }

      if (resposta.status === 'erro_autorizacao' || resposta.status === 'cancelado') {
        const motivo = resposta.erros?.map((e: any) => `${e.codigo}: ${e.mensagem}`).join('; ')
          || resposta.mensagem_sefaz
          || 'Rejeitada pela SEFAZ'

        await supabase
          .from('notas_entrega')
          .update({ status: 'rejeitada', motivo_rejeicao: motivo })
          .eq('id', data.id)

        return { ...data, status: 'rejeitada', motivo_rejeicao: motivo }
      }
      // ainda processando_autorizacao — retorna como está
    } catch {
      // erro de consulta — retorna estado local sem travar a tela
    }
  }

  return data
}
