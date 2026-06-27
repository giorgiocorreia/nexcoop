'use server'

import { getUsuarioLogado } from '@/lib/auth'
import { emitirNfeSaida } from '@/lib/focusnfe/emitir-nfe-saida'
import { gerarZipEEnviarEmail } from '@/lib/comercializacao/zip-lote'

export async function emitirNfeSaidaAction(vendaId: string) {
  const usuario = await getUsuarioLogado()
  return emitirNfeSaida({
    vendaId,
    organizacao_id: usuario.organizacao_id!,
    usuario_id: usuario.id,
    usuario_email: usuario.email ?? undefined,
  })
}

export async function gerarZipLoteAction(loteId: string) {
  return gerarZipEEnviarEmail(loteId)
}
