// Catálogo canônico dos módulos do NexCoop. Função pura — sem I/O, NÃO leva
// 'use server' (regra 5 do CLAUDE.md). Usado pela Sidebar, middleware e pelo
// painel super_admin (formulário de nova org + gestão de módulos de org existente).
import type { TipoOrganizacao } from '@/types/database'

export interface ModuloDef { id: string; nome: string; descricao: string; base: boolean }

// base=true → sempre ativo, não aparece como opção liga/desliga no super_admin.
export const MODULOS: ModuloDef[] = [
  { id: 'cooperados',      nome: 'Cooperados / Filiados', descricao: 'Cadastro de membros',            base: true  },
  { id: 'financeiro',      nome: 'Financeiro',            descricao: 'Caixa, lançamentos, relatórios', base: true  },
  { id: 'assembleias',     nome: 'Assembleias',           descricao: 'Convocações e atas',             base: true  },
  { id: 'documentos',      nome: 'Documentos',            descricao: 'Repositório documental',         base: true  },
  { id: 'mensalidades',    nome: 'Mensalidades',          descricao: 'Cobrança de mensalidades',       base: true  },
  { id: 'comercializacao', nome: 'Comercialização Agro',  descricao: 'Lotes, cotações, safras, NF-e',  base: false },
  { id: 'loja',            nome: 'Loja / PDV',            descricao: 'Ponto de venda e estoque',        base: false },
  { id: 'contabil',        nome: 'Contabilidade',         descricao: 'Plano de contas, DRE, balancete', base: false },
  { id: 'captacao',        nome: 'Captação de Projetos',  descricao: 'Editais e oportunidades',         base: false },
]

export const MODULOS_OPCIONAIS = MODULOS.filter(m => !m.base)
const IDS_BASE = MODULOS.filter(m => m.base).map(m => m.id)

// Módulos padrão ao criar org, por tipo. Base para todos; central já nasce com comercialização.
export function modulosPadrao(tipo: TipoOrganizacao): string[] {
  const extras = tipo === 'central' ? ['comercializacao'] : []
  return [...IDS_BASE, ...extras]
}
