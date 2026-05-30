/**
 * Traduz mensagens de erro técnicas do Supabase/Postgres para português
 * legível pelo usuário. Use em todo setErro() que receba error.message cru.
 */
export function traduzirErro(msg: string | undefined | null): string {
  if (!msg) return 'Erro inesperado. Tente novamente.'
  const m = msg.toLowerCase()

  if (m.includes('duplicate key') || m.includes('already exists') || m.includes('unique constraint'))
    return 'Já existe um registro com esses dados.'

  if (m.includes('null value') || m.includes('not-null constraint') || m.includes('violates not-null'))
    return 'Campo obrigatório não preenchido.'

  if (m.includes('foreign key') || m.includes('violates foreign key'))
    return 'Referência inválida. O dado relacionado não existe.'

  if (m.includes('jwt expired') || m.includes('token expired') || m.includes('session expired'))
    return 'Sessão expirada. Faça login novamente.'

  if (m.includes('permission denied') || m.includes('insufficient privilege') || m.includes('row-level security') || m.includes('new row violates'))
    return 'Sem permissão para realizar esta operação.'

  if (m.includes('value too long') || m.includes('character varying'))
    return 'Um dos campos ultrapassa o tamanho máximo permitido.'

  if (m.includes('invalid input syntax'))
    return 'Formato de dado inválido.'

  if (m.includes('network') || m.includes('fetch failed') || m.includes('econnrefused') || m.includes('etimedout'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.'

  if (m.includes('storage') && m.includes('bucket not found'))
    return 'Bucket de armazenamento não configurado. Informe a URL manualmente.'

  // Se a mensagem original já parece amigável (curta, sem jargão técnico), usa ela
  if (msg.length < 140 && !m.includes('error:') && !m.includes('detail:') && !m.includes('hint:') && !m.includes('pgrst'))
    return msg

  return 'Erro ao salvar. Tente novamente.'
}
