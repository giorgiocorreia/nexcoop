'use server'

// Acompanhamento dos leads vindos dos formulários do site (migration 096).
//
// A gravação do lead é feita pela rota pública (lib/site/coopaibi/formularios.ts);
// aqui é o outro lado: quem já está dentro do sistema marca o que foi
// respondido. Sem isto o `status` da tabela nasceria 'novo' e nunca sairia
// disso, que era exatamente o problema do e-mail no cPanel.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/lib/permissoes'
import { traduzirErro } from '@/lib/utils/erros'
import type { SiteLead } from '@/types/database'

type ResultadoAction<T = undefined> = { data?: T; error?: string }

const STATUS_VALIDOS: SiteLead['status'][] = ['novo', 'em_contato', 'convertido', 'descartado']

// Mesmo padrão de lib/carteirinha/actions.ts: createClient() só para
// auth.getUser(), o resto por admin (regra 2 do CLAUDE.md).
async function verificarAdminDaOrg(): Promise<{ organizacaoId: string }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('role, funcoes, organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario) throw new Error('Usuário não encontrado')
  if (!isAdmin(usuario)) throw new Error('Sem permissão: requer função admin')
  if (!usuario.organizacao_id) throw new Error('Usuário sem organização vinculada')

  return { organizacaoId: usuario.organizacao_id as string }
}

export async function atualizarLead(
  leadId: string,
  campos: { status?: SiteLead['status']; observacoes?: string | null }
): Promise<ResultadoAction> {
  try {
    const { organizacaoId } = await verificarAdminDaOrg()

    if (campos.status && !STATUS_VALIDOS.includes(campos.status)) {
      return { error: 'Status inválido.' }
    }

    const admin = createAdminClient()

    // O id vem do client: confirmar que o lead é desta org antes de escrever.
    // O `.eq('organizacao_id')` no update abaixo já bastaria para não gravar,
    // mas sem esta checagem um id de outra org devolveria "sucesso" silencioso.
    const { data: lead } = await admin
      .from('site_leads')
      .select('id, organizacao_id')
      .eq('id', leadId)
      .single()
    if (!lead || lead.organizacao_id !== organizacaoId) {
      return { error: 'Lead não encontrado nesta organização.' }
    }

    const patch: Record<string, unknown> = {}
    if (campos.status) patch.status = campos.status
    if (campos.observacoes !== undefined) {
      const texto = (campos.observacoes ?? '').trim()
      patch.observacoes = texto || null
    }
    if (Object.keys(patch).length === 0) return {}

    const { error } = await admin
      .from('site_leads')
      .update(patch)
      .eq('id', leadId)
      .eq('organizacao_id', organizacaoId)

    if (error) return { error: traduzirErro(error.message) }

    revalidatePath('/site/leads')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' }
  }
}
