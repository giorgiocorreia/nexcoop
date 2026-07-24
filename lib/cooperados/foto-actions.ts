'use server'

// Upload da foto do cooperado (cooperados.foto_url) — usada na carteirinha
// de identificação (fase 2 da carteirinha do filiado) e em qualquer outro
// lugar que exiba o rosto do cooperado.
//
// Por que createAdminClient() aqui em vez do client do navegador (regra 2 do
// CLAUDE.md, ver também comentário em supabase/migrations/005_storage_setup.sql):
// a policy "avatares_upload" deixa qualquer membro autenticado da ORG inserir
// no bucket, mas a policy "avatares_update" (sobrescrever o MESMO path, que é
// o nosso caso de upsert) só libera para org_admin/super_admin. Ou seja: o
// próprio filiado NÃO conseguiria trocar a própria foto uma segunda vez pela
// policy padrão. Em vez de criar migration nova pra isso, o upload roda
// inteiramente no server action com o client admin (bypassa RLS de storage),
// e a autorização de QUEM pode subir o quê é feita aqui em código, não na
// policy do bucket.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/lib/permissoes'

type ResultadoFoto = { url?: string; error?: string }

// Mesmos tipos aceitos pelo bucket 'avatares' (migration 005) — validado no
// server, nunca confiando no `accept` do <input> do cliente.
const MIME_ACEITOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const TAMANHO_MAX_BYTES = 5 * 1024 * 1024 // 5 MB, mesmo limite do bucket

const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Validações comuns aos dois caminhos de upload (admin e autoatendimento) —
// função só de checagem síncrona, mas fica aqui (arquivo 'use server') porque
// depende do tipo File do runtime de request, não é utilitário puro reusável
// fora de uma action.
function validarArquivo(file: File): string | null {
  if (!MIME_ACEITOS.includes(file.type)) {
    return 'Formato de imagem não suportado. Envie PNG, JPEG, WEBP ou GIF.'
  }
  if (file.size > TAMANHO_MAX_BYTES) {
    return 'Arquivo muito grande. O limite é 5 MB.'
  }
  return null
}

// Sobe o arquivo pro bucket 'avatares' no path {organizacao_id}/cooperados/{cooperado_id}.{ext}
// (estrutura documentada na migration 005) e grava a URL pública completa em
// cooperados.foto_url — a página /v/{codigo} consome esse campo direto como
// <img src>, não pode ser só o path relativo.
async function subirFotoEGravar(
  admin: ReturnType<typeof createAdminClient>,
  organizacaoId: string,
  cooperadoId: string,
  file: File
): Promise<ResultadoFoto> {
  const ext = EXTENSAO_POR_MIME[file.type]
  const path = `${organizacaoId}/cooperados/${cooperadoId}.${ext}`

  const { error: erroUpload } = await admin.storage
    .from('avatares')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (erroUpload) {
    return { error: `Erro ao enviar a foto: ${erroUpload.message}` }
  }

  const { data: urlData } = admin.storage.from('avatares').getPublicUrl(path)

  // Cache-buster: como o path é sobrescrito (upsert) sempre no mesmo nome,
  // o CDN do storage público serviria a versão antiga em cache sem isso.
  const urlComVersao = `${urlData.publicUrl}?v=${Date.now()}`

  const { error: erroUpdate } = await admin
    .from('cooperados')
    .update({ foto_url: urlComVersao, atualizado_em: new Date().toISOString() })
    .eq('id', cooperadoId)

  if (erroUpdate) {
    return { error: `Foto enviada, mas houve erro ao salvar no cadastro: ${erroUpdate.message}` }
  }

  return { url: urlComVersao }
}

// ── Admin: troca a foto de qualquer cooperado da própria org ──────────────

export async function atualizarFotoCooperadoAdmin(
  cooperadoId: string,
  formData: FormData
): Promise<ResultadoFoto> {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    const admin = createAdminClient()
    const { data: usuarioAtual } = await admin
      .from('usuarios')
      .select('role, funcoes, organizacao_id')
      .eq('id', user.id)
      .single()
    if (!usuarioAtual) return { error: 'Usuário não encontrado.' }
    if (!isAdmin(usuarioAtual)) return { error: 'Sem permissão: requer função admin.' }

    const { data: cooperado } = await admin
      .from('cooperados')
      .select('id, organizacao_id')
      .eq('id', cooperadoId)
      .single()
    if (!cooperado || cooperado.organizacao_id !== usuarioAtual.organizacao_id) {
      return { error: 'Cooperado não encontrado nesta organização.' }
    }

    const file = formData.get('foto')
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Nenhum arquivo enviado.' }
    }
    const erroValidacao = validarArquivo(file)
    if (erroValidacao) return { error: erroValidacao }

    const resultado = await subirFotoEGravar(admin, cooperado.organizacao_id as string, cooperadoId, file)
    if (resultado.url) revalidatePath(`/cooperados/${cooperadoId}`)
    return resultado
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

// ── Filiado: troca a própria foto (portal do filiado) ──────────────────────

export async function atualizarFotoPropriaCooperado(formData: FormData): Promise<ResultadoFoto> {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    const admin = createAdminClient()
    const { data: usuarioAtual } = await admin
      .from('usuarios')
      .select('organizacao_id')
      .eq('id', user.id)
      .single()
    if (!usuarioAtual?.organizacao_id) return { error: 'Usuário sem organização vinculada.' }

    // O filiado só pode trocar a PRÓPRIA foto — encontrado pelo vínculo
    // usuario_id, nunca por um id vindo do client.
    const { data: cooperado } = await admin
      .from('cooperados')
      .select('id, organizacao_id')
      .eq('usuario_id', user.id)
      .eq('organizacao_id', usuarioAtual.organizacao_id)
      .maybeSingle()
    if (!cooperado) return { error: 'Cadastro de cooperado não encontrado para este usuário.' }

    const file = formData.get('foto')
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Nenhum arquivo enviado.' }
    }
    const erroValidacao = validarArquivo(file)
    if (erroValidacao) return { error: erroValidacao }

    const resultado = await subirFotoEGravar(admin, cooperado.organizacao_id as string, cooperado.id as string, file)
    if (resultado.url) revalidatePath('/filiado/carteirinha')
    return resultado
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
