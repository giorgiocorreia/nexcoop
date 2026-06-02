export type TipoParceria = 'contabilidade' | 'fornecedor' | 'transportadora' | 'assistencia_tecnica' | 'certificadora' | 'outro'
export type StatusParceria = 'ativo' | 'inativo' | 'pendente'
export type NivelProfissional = 'responsavel' | 'operador' | 'consultor'

export const TIPO_PARCERIA_LABEL: Record<TipoParceria, string> = {
  contabilidade: 'Escritório de Contabilidade',
  fornecedor: 'Fornecedor',
  transportadora: 'Transportadora',
  assistencia_tecnica: 'Assistência Técnica',
  certificadora: 'Certificadora',
  outro: 'Outro',
}

export const NIVEL_LABEL: Record<NivelProfissional, string> = {
  responsavel: 'Responsável',
  operador: 'Operador',
  consultor: 'Consultor',
}

export const MODULOS_POR_TIPO: Record<TipoParceria, string[]> = {
  contabilidade: ['contabil', 'financeiro_leitura', 'cooperados_leitura'],
  fornecedor: ['estoque_fornecedor'],
  transportadora: ['pedidos_leitura'],
  assistencia_tecnica: ['cooperados_leitura', 'documentos_leitura'],
  certificadora: ['cooperados_leitura', 'documentos_leitura'],
  outro: [],
}

export interface EmpresaParceira {
  id: string
  org_id: string
  razao_social: string
  cnpj: string | null
  email_contato: string
  telefone: string | null
  tipo: TipoParceria
  modulos_acesso: string[]
  status: StatusParceria
  site: string | null
  cidade: string | null
  estado: string | null
  observacoes: string | null
  convidado_em: string
  aceito_em: string | null
  created_at: string
  profissionais?: ProfissionalParceiro[]
}

export interface ProfissionalParceiro {
  id: string
  empresa_id: string
  usuario_id: string | null
  nome: string
  email: string
  cargo: string | null
  crc: string | null
  nivel: NivelProfissional
  ativo: boolean
  convidado_em: string
  aceito_em: string | null
  created_at: string
}
