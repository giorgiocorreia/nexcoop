export type TipoConta = 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO' | 'RECEITA' | 'DESPESA'
export type NaturezaConta = 'DEVEDORA' | 'CREDORA'
export type StatusExercicio = 'ABERTO' | 'ENCERRADO'
export type NivelContador = 'contador' | 'contador_aux'

export interface ContaContabil {
  id: string
  org_id: string
  codigo: string
  nome: string
  tipo: TipoConta
  natureza: NaturezaConta
  parent_id: string | null
  nivel: number
  aceita_lancamento: boolean
  ativo: boolean
  created_at: string
  filhos?: ContaContabil[]
}

export interface Partida {
  id: string
  org_id: string
  lancamento_id: string
  conta_debito_id: string
  conta_credito_id: string
  valor: number
  historico: string | null
  classificado_por: string | null
  classificado_em: string
  exercicio_id: string | null
  created_at: string
  conta_debito?: ContaContabil
  conta_credito?: ContaContabil
}

export interface ExercicioContabil {
  id: string
  org_id: string
  ano: number
  data_abertura: string
  data_encerramento: string | null
  status: StatusExercicio
  encerrado_por: string | null
  encerrado_em: string | null
  hash_fechamento: string | null
  created_at: string
}

export interface ContadorOrg {
  id: string
  org_id: string
  usuario_id: string
  escritorio_id: string | null
  nivel: NivelContador
  ativo: boolean
  convidado_em: string
  aceito_em: string | null
}

export interface ItemBalancete {
  conta_id: string
  codigo: string
  nome: string
  nivel: number
  saldo_anterior: number
  debitos: number
  creditos: number
  saldo_atual: number
}

export interface ItemDRE {
  grupo: string
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'resultado'
}
