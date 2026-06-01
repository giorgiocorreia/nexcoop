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

export interface EscritorioContabil {
  id: string
  razao_social: string
  cnpj: string | null
  crc_responsavel: string | null
  email_contato: string
  telefone: string | null
  ativo: boolean
  created_at: string
}

export interface ContaExterna {
  id: string
  escritorio_id: string
  codigo: string
  nome: string
  tipo: TipoConta
  ativo: boolean
  created_at: string
}

export interface DePara {
  id: string
  org_id: string
  contador_org_id: string
  conta_interna_id: string
  conta_externa_id: string
  created_at: string
  conta_interna?: { codigo: string; nome: string }
  conta_externa?: { codigo: string; nome: string }
}

export interface NFeImportada {
  id: string
  org_id: string
  chave_acesso: string
  tipo: 'entrada' | 'saida'
  numero: string | null
  serie: string | null
  data_emissao: string
  cnpj_emitente: string | null
  nome_emitente: string | null
  cnpj_destinatario: string | null
  nome_destinatario: string | null
  valor_total: number
  valor_icms: number
  valor_pis: number
  valor_cofins: number
  xml_original: string | null
  lancamento_id: string | null
  status: 'importada' | 'vinculada' | 'ignorada'
  importado_por: string | null
  created_at: string
  itens?: NFeItem[]
}

export interface NFeItem {
  id: string
  nfe_id: string
  numero_item: number
  codigo_produto: string | null
  descricao: string
  ncm: string | null
  cfop: string | null
  unidade: string | null
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number
}

export interface ConfiguracaoContabil {
  id: string
  org_id: string
  percentual_fundo_reserva: number
  percentual_refac: number
  percentual_fates: number
  criterio_distribuicao: 'proporcional_operacoes' | 'proporcional_cotas' | 'igualitario'
  observacoes: string | null
  updated_at: string
}

export interface FechamentoExercicio {
  id: string
  org_id: string
  exercicio_id: string
  sobras_brutas: number
  fundo_reserva: number
  refac: number
  fates: number
  sobras_distribuiveis: number
  fechado_por: string
  fechado_por_perfil: 'contador' | 'admin'
  crc_contador: string | null
  hash_fechamento: string
  observacoes: string | null
  created_at: string
}

export interface ItemBalancoPatrimonial {
  grupo: string
  tipo: 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO'
  conta_id: string
  codigo: string
  nome: string
  nivel: number
  saldo: number
}

export interface ItemLivroRazao {
  data: string
  lancamento_id: string
  descricao: string
  debito: number
  credito: number
  saldo_progressivo: number
  historico: string | null
}

export interface ItemLivroDiario {
  id: string
  org_id: string
  exercicio_id: string
  numero_lancamento: number
  data_lancamento: string
  historico: string
  partida_id: string | null
  valor: number
  created_at: string
}

export interface DistribuicaoSobras {
  id: string
  org_id: string
  fechamento_id: string
  cooperado_id: string
  valor_operacoes: number
  percentual: number
  valor_sobras: number
  status: 'calculado' | 'pago' | 'retido'
  created_at: string
  cooperado?: { nome: string; cpf: string }
}
