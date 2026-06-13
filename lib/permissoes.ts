/**
 * PONTO CENTRAL DE PERMISSÕES — toda verificação de acesso no sistema
 * deve passar por aqui. Nunca compare role ou funcoes diretamente nos
 * componentes; importe e use as funções abaixo.
 */

// membro_id: preenchido quando a query de carregamento faz left join com membros.
// TODO: incluir membro_id nas queries que montam este objeto (via left join membros on usuario_id).
type UsuarioPermissao = { role: string; funcoes: string[]; membro_id?: string | null }

export function temFuncao(usuario: UsuarioPermissao, funcao: string): boolean {
  if (usuario.role === 'super_admin') return true
  return usuario.funcoes.includes(funcao)
}

export function temAlgumaFuncao(usuario: UsuarioPermissao, funcoes: string[]): boolean {
  if (usuario.role === 'super_admin') return true
  return funcoes.some(f => usuario.funcoes.includes(f))
}

export function isAdmin(usuario: UsuarioPermissao): boolean {
  return temFuncao(usuario, 'admin')
}

export function isSuperAdmin(usuario: UsuarioPermissao): boolean {
  return usuario.role === 'super_admin'
}

export function isContador(usuario: UsuarioPermissao): boolean {
  return temAlgumaFuncao(usuario, ['contador', 'contador_aux'])
}

export function isContadorAtivo(usuario: UsuarioPermissao, orgId: string): boolean {
  return isContador(usuario) && (usuario as any).org_id === orgId
}

export function isMembro(usuario: UsuarioPermissao): boolean {
  return !!usuario.membro_id
}
