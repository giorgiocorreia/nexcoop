// Nomenclatura do membro por tipo de org (cooperativa/central = "Cooperado",
// associacao = "Associado"). Função pura — sem I/O, NÃO leva 'use server'
// (regra 5 do CLAUDE.md).
import type { TipoOrganizacao } from '@/types/database'

export interface Nomenclatura { singular: string; plural: string; novo: string; artigo: string }

export function nomenclatura(tipo?: TipoOrganizacao | string | null): Nomenclatura {
  if (tipo === 'associacao')
    return { singular: 'Associado', plural: 'Associados', novo: 'Novo associado', artigo: 'o' }
  // cooperativa, central e fallback
  return { singular: 'Cooperado', plural: 'Cooperados', novo: 'Novo cooperado', artigo: 'o' }
}
