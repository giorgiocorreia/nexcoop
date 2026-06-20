'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Buscar cotas do cooperado ─────────────────────────────────────────────────
export async function buscarCotas(cooperadoId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cotas_cooperado')
    .select('*')
    .eq('cooperado_id', cooperadoId)
    .order('tipo_cota')
  if (error) throw new Error(error.message)

  // Buscar grupos vinculados separadamente para evitar erro de FK no tipo customizado
  const cotasComGrupo = await Promise.all((data ?? []).map(async c => {
    if (!c.grupo_id) return { ...c, grupo: null }
    const { data: g } = await supabase
      .from('grupos_colaboradores')
      .select('id, nome, cnpj')
      .eq('id', c.grupo_id)
      .maybeSingle()
    return { ...c, grupo: g ?? null }
  }))

  return cotasComGrupo
}

// ── Buscar grupos da org ──────────────────────────────────────────────────────
export async function buscarGrupos(orgId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grupos_colaboradores')
    .select('*')
    .eq('organizacao_id', orgId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw new Error(error.message)
  return data ?? []
}

// ── Criar grupo inline ────────────────────────────────────────────────────────
export async function criarGrupo(orgId: string, dados: {
  nome: string
  cnpj?: string
  descricao?: string
}) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('grupos_colaboradores')
    .insert({ organizacao_id: orgId, ...dados })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ── Salvar cota (upsert) ──────────────────────────────────────────────────────
export async function salvarCota(
  cooperadoId: string,
  orgId: string,
  tipo: 'plena' | 'colaboradora',
  dados: {
    quantidade: number
    valor_cota: number
    status: string
    grupo_id?: string | null
  }
) {
  if (tipo === 'colaboradora' && !dados.grupo_id) {
    throw new Error('Cota colaboradora exige um grupo vinculado.')
  }
  if (tipo === 'colaboradora') {
    dados.quantidade = 1
  }

  const supabase = createAdminClient()

  const payload = {
    cooperado_id:   cooperadoId,
    organizacao_id: orgId,
    tipo_cota:      tipo,
    quantidade:     dados.quantidade,
    valor_cota:     dados.valor_cota,
    status:         dados.status as 'integralizada' | 'parcial' | 'pendente',
    grupo_id:       dados.grupo_id ?? null,
    atualizado_em:  new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('cotas_cooperado')
    .upsert(payload, { onConflict: 'cooperado_id,tipo_cota' })
    .select()
    .single()

  if (error) throw new Error(error.message)

  let alertaRepresentante: string | null = null

  if (tipo === 'colaboradora' && dados.grupo_id) {
    const grupoId = dados.grupo_id

    const { count: totalMembros } = await supabase
      .from('cotas_cooperado')
      .select('*', { count: 'exact', head: true })
      .eq('grupo_id', grupoId)
      .eq('tipo_cota', 'colaboradora')

    const total = totalMembros ?? 0
    const representantesNecessarios = Math.floor(total / 10)

    if (total > 0 && total % 10 === 0) {
      const { count: repAtivos } = await supabase
        .from('grupo_representantes')
        .select('*', { count: 'exact', head: true })
        .eq('grupo_id', grupoId)
        .eq('ativo', true)

      if ((repAtivos ?? 0) < representantesNecessarios) {
        alertaRepresentante = `Este grupo atingiu ${total} membros. Por favor, indique o ${representantesNecessarios}º representante oficial do grupo.`

        // Buscar cooperados do grupo para notificar
        const { data: membros } = await supabase
          .from('cotas_cooperado')
          .select('cooperado_id')
          .eq('grupo_id', grupoId)
          .eq('tipo_cota', 'colaboradora')

        const cooperadoIds = (membros ?? []).map(m => m.cooperado_id).filter(Boolean)

        if (cooperadoIds.length > 0) {
          const { data: cooperadosData } = await supabase
            .from('cooperados')
            .select('id, usuario_id')
            .in('id', cooperadoIds)

          const notificacoes = (cooperadosData ?? [])
            .filter((c): c is typeof c & { usuario_id: string } => !!c.usuario_id)
            .map(c => ({
              organizacao_id: orgId,
              usuario_id:     c.usuario_id,
              tipo:           'sistema' as const,
              titulo:         'Grupo precisa de representante',
              mensagem:       alertaRepresentante as string,
              lida:           false,
              ref_tipo:       'grupo_colaboradores',
              ref_id:         grupoId,
            }))

          if (notificacoes.length > 0) {
            await supabase.from('notificacoes').insert(notificacoes)
          }
        }
      }
    }
  }

  revalidatePath(`/cooperados/${cooperadoId}`)
  return { cota: data, alertaRepresentante }
}

// ── Remover cota ──────────────────────────────────────────────────────────────
export async function removerCota(cotaId: string, cooperadoId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('cotas_cooperado')
    .delete()
    .eq('id', cotaId)
  if (error) throw new Error(error.message)
  revalidatePath(`/cooperados/${cooperadoId}`)
}

// ── Indicar representante ─────────────────────────────────────────────────────
export async function indicarRepresentante(
  grupoId: string,
  cooperadoId: string,
  orgId: string,
  indicadoPor: string
) {
  const supabase = createAdminClient()

  const { data: membro } = await supabase
    .from('cotas_cooperado')
    .select('id')
    .eq('grupo_id', grupoId)
    .eq('cooperado_id', cooperadoId)
    .eq('tipo_cota', 'colaboradora')
    .maybeSingle()

  if (!membro) throw new Error('O representante deve ser membro do grupo.')

  const { error } = await supabase
    .from('grupo_representantes')
    .upsert(
      { grupo_id: grupoId, cooperado_id: cooperadoId, organizacao_id: orgId, ativo: true, indicado_por: indicadoPor },
      { onConflict: 'grupo_id,cooperado_id' }
    )
  if (error) throw new Error(error.message)
}
