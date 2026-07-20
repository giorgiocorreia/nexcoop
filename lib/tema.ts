// Cor da marca por org — padrão por tipo com override manual (cor_primaria).
// Função pura — sem I/O, NÃO leva 'use server' (regra 5 do CLAUDE.md).
import type { TipoOrganizacao } from '@/types/database'

export const COR_POR_TIPO: Record<TipoOrganizacao, string> = {
  cooperativa: '#1B5E20',
  associacao:  '#0F766E',
  central:     '#185FA5',
}

// Tom mais claro para o topo do gradiente da faixa. Hand-pick nos conhecidos;
// para override arbitrário, clareia ~12%.
const MD_CONHECIDO: Record<string, string> = {
  '#1B5E20': '#2E7D32',
  '#0F766E': '#14857A',
  '#185FA5': '#1E73C0',
}

function clarear(hex: string, pct = 0.14): string {
  const h = hex.replace('#',''); if (h.length !== 6) return hex
  const n = parseInt(h,16)
  const r = Math.min(255, Math.round((n>>16 & 255) + 255*pct))
  const g = Math.min(255, Math.round((n>>8  & 255) + 255*pct))
  const b = Math.min(255, Math.round((n     & 255) + 255*pct))
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)
}

// Só aceita #rgb / #rrggbb. cor_primaria vira CSS var inline no layout — sem
// isso, um valor não-hex salvo no banco viraria injeção de CSS.
function hexValido(cor: string | null | undefined): cor is string {
  return !!cor && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cor)
}

export function corPrimariaOrg(org?: { tipo?: TipoOrganizacao | null; cor_primaria?: string | null } | null): string {
  if (hexValido(org?.cor_primaria)) return org!.cor_primaria!
  return COR_POR_TIPO[org?.tipo ?? 'cooperativa'] || '#1B5E20'
}

// Retorna { base, md, bg } para setar as CSS vars.
export function temaOrg(org?: { tipo?: TipoOrganizacao | null; cor_primaria?: string | null } | null) {
  const base = corPrimariaOrg(org)
  const md = MD_CONHECIDO[base] ?? clarear(base)
  return { base, md, bg: `linear-gradient(180deg, ${md} 0%, ${base} 100%)` }
}
