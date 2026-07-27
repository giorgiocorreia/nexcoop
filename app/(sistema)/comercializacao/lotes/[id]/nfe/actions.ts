'use server'

import { getUsuarioLogado } from '@/lib/auth'
import { emitirNfeSaida, sincronizarNfeSaida } from '@/lib/focusnfe/emitir-nfe-saida'
import { gerarZipLote } from '@/lib/comercializacao/zip-lote'
import { revalidatePath } from 'next/cache'

export async function emitirNfeSaidaAction(vendaId: string) {
  const usuario = await getUsuarioLogado()
  return emitirNfeSaida({
    vendaId,
    organizacao_id: usuario.organizacao_id!,
    usuario_id: usuario.id,
    usuario_email: usuario.email ?? undefined,
  })
}

export async function sincronizarNfeSaidaAction(vendaId: string) {
  const usuario = await getUsuarioLogado()
  const resultado = await sincronizarNfeSaida({
    vendaId,
    organizacao_id: usuario.organizacao_id!,
    usuario_id: usuario.id,
    usuario_email: usuario.email ?? undefined,
  })
  revalidatePath('/comercializacao/fiscal')
  revalidatePath(`/comercializacao/lotes`)
  return resultado
}

export async function gerarZipLoteAction(loteId: string) {
  return gerarZipLote(loteId)
}
