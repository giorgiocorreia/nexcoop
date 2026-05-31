export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TipoOrganizacao = 'cooperativa' | 'associacao' | 'central'
export type PlanoOrganizacao = 'gratuito' | 'essencial' | 'profissional' | 'cooperativa' | 'agro' | 'impacto' | 'enterprise'
/** Papel estrutural: super_admin (plataforma) ou membro (usuário de uma org). */
export type RoleUsuario = 'super_admin' | 'membro'

/** Tipo de vínculo da pessoa com a organização. */
export type VinculoUsuario = 'cooperado' | 'funcionario' | 'diretoria' | 'externo'

/** Função operacional exercida no sistema. */
export type FuncaoUsuario = 'admin' | 'financeiro' | 'tecnico' | 'conselho_fiscal' | 'captador'
export type StatusCooperado = 'proposta' | 'probatorio' | 'ativo' | 'inadimplente' | 'suspenso' | 'demitido' | 'excluido'
export type TipoLancamento = 'receita' | 'despesa' | 'transferencia'
export type StatusLancamento = 'pendente' | 'pago' | 'cancelado' | 'agendado'
export type TipoAssembleia = 'AGO' | 'AGE' | 'reuniao_CA' | 'reuniao_CF'
export type StatusAssembleia = 'agendada' | 'realizada' | 'cancelada'
export type CategoriaDocumento = 'estatuto' | 'ata' | 'contrato' | 'convenio' | 'edital' | 'certidao' | 'licenca' | 'relatorio' | 'financeiro' | 'projeto' | 'aditivo' | 'outro'
export type TipoNotificacao   = 'alerta_documento' | 'alerta_caf' | 'alerta_certidao' | 'assembleia_convocacao' | 'financeiro_vencimento' | 'cooperado_novo' | 'sistema' | 'outro'
export type StatusMensalidade = 'pendente' | 'pago' | 'vencido'

export type StatusAssinatura = 'active' | 'past_due' | 'canceled' | 'trialing'

export type StatusOportunidade = 'identificado' | 'contatado' | 'proposta' | 'aguardando' | 'aprovado' | 'reprovado' | 'arquivado'
export type FonteOportunidade  = 'internacional' | 'nacional' | 'manual' | 'agregador'
export type StatusCota         = 'integralizada' | 'parcial' | 'pendente'

export interface Organizacao {
  id: string
  nome: string
  nome_curto: string | null
  cnpj: string | null
  tipo: TipoOrganizacao
  email: string | null
  telefone: string | null
  site: string | null
  logo_url: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string
  estado: string
  caf_numero: string | null
  caf_situacao: string | null
  caf_validade: string | null
  data_fundacao: string | null
  registro_juceb: string | null
  ativo: boolean
  plano: PlanoOrganizacao
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  subscription_status: StatusAssinatura | null
  onboarding_concluido: boolean
  isento: boolean
  isento_ate: string | null
  trial_ends_at: string | null
  subscription_ends_at: string | null
  criado_em: string
  atualizado_em: string
}

export interface Usuario {
  id: string
  organizacao_id: string | null
  nome_completo: string
  cpf: string | null
  email: string
  telefone: string | null
  avatar_url: string | null
  role: RoleUsuario
  funcoes: string[]
  vinculo: VinculoUsuario | null
  ativo: boolean
  ultimo_acesso: string | null
  criado_em: string
  atualizado_em: string
}

export interface Oportunidade {
  id: string
  organizacao_id: string
  titulo: string
  financiador: string
  fonte: FonteOportunidade
  fonte_detalhe: string | null
  fonte_url: string | null
  area_tematica: string[]
  valor_estimado: number | null
  valor_captado: number | null
  moeda: string
  status: StatusOportunidade
  prazo_submissao: string | null
  prazo_resultado: string | null
  responsavel_id: string | null
  observacoes: string | null
  documentos: Json
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export interface OportunidadeLog {
  id: string
  oportunidade_id: string
  usuario_id: string | null
  acao: string
  status_anterior: string | null
  status_novo: string | null
  descricao: string | null
  criado_em: string
}

export interface PerfilCaptacao {
  id: string
  organizacao_id: string
  areas_tematicas: string[]
  publicos_alvo: string[]
  abrangencia: string[]
  porte_min: number | null
  porte_max: number | null
  idiomas: string[]
  municipios: string[]
  tipo_org: string[]
  descricao_org: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface RadarFonte {
  id: string
  organizacao_id: string
  nome: string
  url: string
  tipo: string
  ativo: boolean
  ultima_varredura: string | null
  criado_em: string
}

export interface RadarResultado {
  id: string
  organizacao_id: string
  fonte_id: string | null
  titulo: string
  descricao: string | null
  financiador: string | null
  url_edital: string | null
  valor_estimado: number | null
  prazo_submissao: string | null
  areas_tematicas: string[]
  publico_alvo: string[]
  score: number
  compatibilidade: string
  motivo: string | null
  adicionado_ao_pipeline: boolean
  oportunidade_id: string | null
  varredura_em: string
}

export interface CotaCooperado {
  id:             string
  cooperado_id:   string
  organizacao_id: string
  quantidade:     number
  valor_cota:     number
  status:         StatusCota
  criado_em:      string
  atualizado_em:  string
}

export interface CotaIntegralizacao {
  id:             string
  cota_id:        string
  cooperado_id:   string
  organizacao_id: string
  data:           string
  quantidade:     number
  valor_pago:     number
  criado_em:      string
}

export interface FuncaoDisponivel {
  id: string
  organizacao_id: string | null
  nome: string
  label: string
  descricao: string | null
  modulo: string | null
  is_padrao: boolean
  criado_em: string
}

export interface Cooperado {
  id: string
  organizacao_id: string
  usuario_id: string | null
  nome_completo: string
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  sexo: 'M' | 'F' | 'outro' | null
  email: string | null
  telefone: string | null
  whatsapp: string | null
  foto_url: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  quota_parte: number | null
  nome_propriedade: string | null
  area_total_ha: number | null
  latitude: number | null
  longitude: number | null
  caf_numero: string | null
  caf_situacao: string | null
  caf_validade: string | null
  dap_numero: string | null
  status: StatusCooperado
  data_admissao: string | null
  data_saida: string | null
  motivo_saida: string | null
  numero_matricula: string | null
  tipo: 'pessoa_fisica' | 'pessoa_juridica'
  cnpj_pj: string | null
  representante_nome: string | null
  representante_cpf: string | null
  criado_em: string
  atualizado_em: string
}

export interface Lancamento {
  id: string
  organizacao_id: string
  tipo: TipoLancamento
  status: StatusLancamento
  descricao: string
  valor: number
  data_competencia: string
  data_vencimento: string | null
  data_pagamento: string | null
  categoria_id: string | null
  conta_id: string | null
  conta_destino_id: string | null
  cooperado_id: string | null
  centro_custo: string | null
  projeto_id: string | null
  recorrente: boolean
  frequencia: 'mensal' | 'trimestral' | 'anual' | null
  comprovante_url: string | null
  numero_documento: string | null
  observacoes: string | null
  usuario_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface Assembleia {
  id: string
  organizacao_id: string
  tipo: TipoAssembleia
  titulo: string
  data_realizacao: string
  local: string | null
  modalidade: 'presencial' | 'remota' | 'hibrida'
  status: StatusAssembleia
  data_convocacao: string | null
  convocacao_enviada: boolean
  edital_url: string | null
  quorum_minimo: number | null
  total_presentes: number
  quorum_atingido: boolean
  pauta: string | null
  observacoes: string | null
  ata_gerada: boolean
  ata_url: string | null
  ata_assinada: boolean
  usuario_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface Documento {
  id: string
  organizacao_id: string
  nome: string
  descricao: string | null
  categoria: CategoriaDocumento
  arquivo_url: string
  tamanho_bytes: number | null
  tipo_mime: string | null
  versao: number
  documento_pai_id: string | null
  data_emissao: string | null
  data_validade: string | null
  orgao_emissor: string | null
  numero_documento: string | null
  alerta_dias: number
  restrito: boolean
  usuario_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface Mensalidade {
  id: string
  organizacao_id: string
  cooperado_id: string
  mes_referencia: string
  valor: number
  status: StatusMensalidade
  data_vencimento: string
  data_pagamento: string | null
  observacoes: string | null
  usuario_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface Notificacao {
  id: string
  organizacao_id: string
  usuario_id: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  lida: boolean
  data_leitura: string | null
  link: string | null
  ref_tipo: string | null
  ref_id: string | null
  criado_em: string
}

// Formato compatível com GenericSchema do @supabase/ssr
// A intersecção com Record<string, unknown> é necessária para satisfazer
// o constraint Row: Record<string, unknown> do GenericTable do postgrest-js
type TableDef<T> = {
  Row:    T & Record<string, unknown>
  Insert: Partial<T> & Record<string, unknown>
  Update: Partial<T> & Record<string, unknown>
  Relationships: never[]
}

export type Database = {
  public: {
    Tables: {
      organizacoes:        TableDef<Organizacao>
      usuarios:            TableDef<Usuario>
      cooperados:          TableDef<Cooperado>
      lancamentos:         TableDef<Lancamento>
      assembleias:         TableDef<Assembleia>
      documentos:          TableDef<Documento>
      mensalidades:        TableDef<Mensalidade>
      notificacoes:        TableDef<Notificacao>
      funcoes_disponiveis: TableDef<FuncaoDisponivel>
      oportunidades:       TableDef<Oportunidade>
      oportunidade_logs:   TableDef<OportunidadeLog>
      perfil_captacao:     TableDef<PerfilCaptacao>
      radar_fontes:         TableDef<RadarFonte>
      radar_resultados:     TableDef<RadarResultado>
      cotas_cooperado:      TableDef<CotaCooperado>
      cotas_integralizacao: TableDef<CotaIntegralizacao>
    }
    Views:          { [_ in never]: never }
    Functions:      { [_ in never]: never }
    Enums:          { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}