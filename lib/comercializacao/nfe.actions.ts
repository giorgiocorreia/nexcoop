'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { emitirNfeEntrada, consultarNfeEntrada } from '@/lib/focusnfe/emitir-nfe-entrada'
import { urlCompleta } from '@/lib/focusnfe/client'

export async function emitirNfeEntradaAction(
  movimentacao_id: string,
  preco_unitario_override?: number
) {
  const usuario = await getUsuarioLogado()
  const resultado = await emitirNfeEntrada({
    movimentacao_id,
    organizacao_id: usuario.organizacao_id as string,
    preco_unitario_override,
  })
  return resultado
}

export async function getCotacaoParaModal(movimentacao_id: string) {
  const supabase = createAdminClient()
  const usuario = await getUsuarioLogado()

  const { data: mov } = await supabase
    .from('movimentacoes_conta')
    .select('produto_id, created_at')
    .eq('id', movimentacao_id)
    .single()

  if (!mov) return null

  const dataMovimentacao = new Date(mov.created_at).toISOString().split('T')[0]

  const { data: cotacao } = await supabase
    .from('cotacoes')
    .select('preco_cooperado, preco_externo')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('produto_id', mov.produto_id as string)
    .lte('vigente_a_partir_de', new Date().toISOString())
    .order('vigente_a_partir_de', { ascending: false })
    .limit(1)
    .maybeSingle()

  return cotacao ? {
    preco_cooperado: Number(cotacao.preco_cooperado),
    preco_externo: Number(cotacao.preco_externo),
  } : null
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
  if ((data.status as string) === 'processando' && data.referencia) {
    try {
      const resposta = await consultarNfeEntrada(data.referencia as string)

      if (resposta.status === 'autorizado') {
        const danfe_url = urlCompleta(resposta.caminho_danfe)
        const xml_url = urlCompleta(resposta.caminho_xml_nota_fiscal)

        await supabase
          .from('notas_entrega')
          .update({
            status: 'autorizada' as any,
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
          .update({ status: 'rejeitada' as any, motivo_rejeicao: motivo })
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
