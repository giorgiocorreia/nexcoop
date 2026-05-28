export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TipoOrganizacao = 'cooperativa' | 'associacao' | 'central'
export type PlanoOrganizacao = 'essencial' | 'cooperativa' | 'agro' | 'impacto' | 'enterprise'
export type RoleUsuario = 'super_admin' | 'org_admin' | 'financeiro' | 'tecnico' | 'comercial' | 'conselho_fiscal' | 'cooperado' | 'parceiro'
export type StatusCooperado = 'proposta' | 'probatorio' | 'ativo' | 'inadimplente' | 'suspenso' | 'demitido' | 'excluido'
export type TipoLancamento = 'receita' | 'despesa' | 'transferencia'
export type StatusLancamento = 'pendente' | 'pago' | 'cancelado' | 'agendado'
export type TipoAssembleia = 'AGO' | 'AGE' | 'reuniao_CA' | 'reuniao_CF'
export type StatusAssembleia = 'agendada' | 'realizada' | 'cancelada'
export type CategoriaDocumento = 'estatuto' | 'ata' | 'contrato' | 'convenio' | 'edital' | 'certidao' | 'licenca' | 'relatorio' | 'financeiro' | 'projeto' | 'aditivo' | 'outro'
export type TipoNotificacao   = 'alerta_documento' | 'alerta_caf' | 'alerta_certidao' | 'assembleia_convocacao' | 'financeiro_vencimento' | 'cooperado_novo' | 'sistema' | 'outro'
export type StatusMensalidade = 'pendente' | 'pago' | 'vencido'

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
  ativo: boolean
  ultimo_acesso: string | null
  criado_em: string
  atualizado_em: string
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
      organizacoes: TableDef<Organizacao>
      usuarios:     TableDef<Usuario>
      cooperados:   TableDef<Cooperado>
      lancamentos:  TableDef<Lancamento>
      assembleias:  TableDef<Assembleia>
      documentos:    TableDef<Documento>
      mensalidades:  TableDef<Mensalidade>
      notificacoes:  TableDef<Notificacao>
    }
    Views:          { [_ in never]: never }
    Functions:      { [_ in never]: never }
    Enums:          { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}