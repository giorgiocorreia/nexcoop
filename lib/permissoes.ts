import { temModulo } from '@/lib/org'

/**
 * PONTO CENTRAL DE PERMISSÕES — toda verificação de acesso no sistema
 * deve passar por aqui. Nunca compare role ou funcoes diretamente nos
 * componentes; importe e use as funções abaixo.
 */

// cooperado_id: preenchido quando a query de carregamento expõe o vínculo com cooperados.
// TODO: incluir cooperado_id nas queries que montam este objeto
//       (via produtores.usuario_id -> produtores.cooperado_id).
type UsuarioPermissao = { role: string; funcoes: string[]; cooperado_id?: string | null }

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

export function isCooperado(usuario: UsuarioPermissao): boolean {
  return !!usuario.cooperado_id
}

/**
 * Verifica se a org tem um módulo ativo.
 * Para uso dentro de server actions junto com verificações de permissão.
 */
export function orgTemModulo(
  modulos_ativos: string[] | null | undefined,
  modulo: string
): boolean {
  return temModulo(modulos_ativos, modulo)
}
