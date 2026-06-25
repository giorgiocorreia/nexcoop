export type PlanoId = 'gratuito' | 'essencial' | 'profissional' | 'agro' | 'enterprise'

export interface Plano {
  id: PlanoId
  nome: string
  limite_filiados: number | null  // null = ilimitado
  preco_mensal: number | null
  stripe_price_id: string | null
}

export const PLANOS: Record<PlanoId, Plano> = {
  gratuito: {
    id: 'gratuito',
    nome: 'Gratuito',
    limite_filiados: 10,
    preco_mensal: null,
    stripe_price_id: null,
  },
  essencial: {
    id: 'essencial',
    nome: 'Essencial',
    limite_filiados: 50,
    preco_mensal: 149,
    stripe_price_id: process.env.STRIPE_PRICE_ESSENCIAL ?? null,
  },
  profissional: {
    id: 'profissional',
    nome: 'Profissional',
    limite_filiados: 200,
    preco_mensal: 499,
    stripe_price_id: process.env.STRIPE_PRICE_PROFISSIONAL ?? null,
  },
  agro: {
    id: 'agro',
    nome: 'Agro',
    limite_filiados: null,
    preco_mensal: 1500,
    stripe_price_id: process.env.STRIPE_PRICE_AGRO ?? null,
  },
  enterprise: {
    id: 'enterprise',
    nome: 'Enterprise',
    limite_filiados: null,
    preco_mensal: null,
    stripe_price_id: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
  },
}

export function getLimiteFiliados(plano: string): number | null {
  return PLANOS[plano as PlanoId]?.limite_filiados ?? null
}

export function getProximoPlano(planoAtual: string): Plano | null {
  const ordem: PlanoId[] = ['gratuito', 'essencial', 'profissional', 'agro', 'enterprise']
  const idx = ordem.indexOf(planoAtual as PlanoId)
  if (idx === -1 || idx >= ordem.length - 1) return null
  return PLANOS[ordem[idx + 1]]
}