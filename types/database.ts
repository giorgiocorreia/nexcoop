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

// ── Loja Agropecuária ─────────────────────────────────────────────────────────

export type LojaUnidade       = 'kg' | 'litro' | 'unidade' | 'saco' | 'caixa'
export type LojaStatusCaixa   = 'aberto' | 'fechado'
export type LojaTipoCliente   = 'cooperado' | 'externo'
export type LojaCanal         = 'presencial' | 'online'
export type LojaStatusVenda   = 'concluida' | 'cancelada' | 'aguardando_retirada' | 'retirada'
export type LojaTipoMovimento = 'entrada' | 'saida_venda' | 'saida_manual' | 'inventario'
export type LojaStatusPedido  = 'pendente' | 'confirmado' | 'pronto' | 'retirado' | 'cancelado'

export interface LojaFornecedor {
  id:        string
  org_id:    string
  nome:      string
  cnpj:      string | null
  telefone:  string | null
  email:     string | null
  ativo:     boolean
  criado_em: string
}

export interface LojaProduto {
  id:              string
  org_id:          string
  nome:            string
  categoria:       string | null
  unidade:         LojaUnidade
  preco_normal:    number
  preco_cooperado: number
  estoque_atual:   number
  estoque_minimo:  number | null
  fornecedor_id:   string | null
  ativo:           boolean
  criado_em:       string
  atualizado_em:   string
}

export interface LojaCliente {
  id:           string
  org_id:       string
  nome:         string
  cpf:          string | null
  telefone:     string | null
  email:        string | null
  cooperado_id: string | null
  ativo:        boolean
  criado_em:    string
}

export interface LojaLote {
  id:                 string
  org_id:             string
  produto_id:         string
  numero_lote:        string | null
  data_validade:      string | null
  quantidade_entrada: number
  quantidade_atual:   number
  preco_custo:        number
  criado_em:          string
}

export interface LojaCaixa {
  id:               string
  org_id:           string
  usuario_id:       string
  valor_abertura:   number
  valor_fechamento: number | null
  total_especie:    number
  total_cartao:     number
  total_pix:        number
  status:           LojaStatusCaixa
  aberto_em:        string
  fechado_em:       string | null
}

export interface LojaVenda {
  id:           string
  org_id:       string
  caixa_id:     string
  cliente_id:   string | null
  cooperado_id: string | null
  tipo_cliente: LojaTipoCliente
  canal:        LojaCanal
  status:       LojaStatusVenda
  total:        number
  pago_especie: number
  pago_cartao:  number
  pago_pix:     number
  criado_em:    string
}

export interface LojaVendaItem {
  id:             string
  venda_id:       string
  produto_id:     string
  lote_id:        string | null
  quantidade:     number
  preco_unitario: number
  subtotal:       number
}

export interface LojaCompra {
  id:            string
  org_id:        string
  fornecedor_id: string
  usuario_id:    string
  numero_nota:   string | null
  total:         number
  criado_em:     string
}

export interface LojaCompraItem {
  id:            string
  compra_id:     string
  produto_id:    string
  numero_lote:   string | null
  data_validade: string | null
  quantidade:    number
  preco_custo:   number
  subtotal:      number
}

export interface LojaEstoqueMovimento {
  id:            string
  org_id:        string
  produto_id:    string
  lote_id:       string | null
  tipo:          LojaTipoMovimento
  quantidade:    number
  motivo:        string | null
  referencia_id: string | null
  criado_em:     string
}

export interface LojaPedidoOnline {
  id:                       string
  org_id:                   string
  cliente_id:               string | null
  cooperado_id:             string | null
  status:                   LojaStatusPedido
  data_retirada_solicitada: string | null
  total:                    number
  observacao:               string | null
  criado_em:                string
  atualizado_em:            string
}

export interface LojaPedidoItem {
  id:             string
  pedido_id:      string
  produto_id:     string
  quantidade:     number
  preco_unitario: number
  subtotal:       number
}

// ── Módulo Contábil ───────────────────────────────────────────────────────────

export type TipoContabil        = 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO' | 'RECEITA' | 'DESPESA'
export type NaturezaContabil    = 'DEVEDORA' | 'CREDORA'
export type StatusExercicio     = 'ABERTO' | 'ENCERRADO'
export type NivelContador       = 'contador' | 'contador_aux'
export type StatusNFe           = 'importada' | 'vinculada' | 'ignorada'
export type TipoNFe             = 'entrada' | 'saida'

export interface PlanoContas {
  id:                string
  org_id:            string
  codigo:            string
  nome:              string
  tipo:              TipoContabil
  natureza:          NaturezaContabil
  parent_id:         string | null
  nivel:             number
  aceita_lancamento: boolean
  ativo:             boolean
  created_at:        string
}

export interface Partida {
  id:               string
  org_id:           string
  lancamento_id:    string
  conta_debito_id:  string
  conta_credito_id: string
  valor:            number
  historico:        string | null
  classificado_por: string | null
  classificado_em:  string
  exercicio_id:     string | null
  created_at:       string
}

export interface ExercicioContabil {
  id:                string
  org_id:            string
  ano:               number
  data_abertura:     string
  data_encerramento: string | null
  status:            StatusExercicio
  encerrado_por:     string | null
  encerrado_em:      string | null
  hash_fechamento:   string | null
  created_at:        string
}

export interface ComentarioContabil {
  id:            string
  org_id:        string
  lancamento_id: string
  autor_id:      string
  texto:         string
  resolvido:     boolean
  created_at:    string
}

export interface EscritorioContabil {
  id:               string
  razao_social:     string
  cnpj:             string | null
  crc_responsavel:  string | null
  email_contato:    string
  telefone:         string | null
  ativo:            boolean
  created_at:       string
}

export interface ContadorOrg {
  id:            string
  org_id:        string
  usuario_id:    string
  escritorio_id: string | null
  nivel:         NivelContador
  ativo:         boolean
  convidado_em:  string
  aceito_em:     string | null
}

export interface PlanoContasExterno {
  id:            string
  escritorio_id: string
  codigo:        string
  nome:          string
  tipo:          TipoContabil
  ativo:         boolean
  created_at:    string
}

export interface DeParaContas {
  id:               string
  org_id:           string
  contador_org_id:  string
  conta_interna_id: string
  conta_externa_id: string
  created_at:       string
}

export interface NFeImportada {
  id:                 string
  org_id:             string
  chave_acesso:       string
  tipo:               TipoNFe
  numero:             string | null
  serie:              string | null
  data_emissao:       string
  cnpj_emitente:      string | null
  nome_emitente:      string | null
  cnpj_destinatario:  string | null
  nome_destinatario:  string | null
  valor_total:        number
  valor_icms:         number
  valor_pis:          number
  valor_cofins:       number
  xml_original:       string | null
  lancamento_id:      string | null
  status:             StatusNFe
  importado_por:      string | null
  created_at:         string
}

export interface NFeItem {
  id:              string
  nfe_id:          string
  numero_item:     number
  codigo_produto:  string | null
  descricao:       string
  ncm:             string | null
  cfop:            string | null
  unidade:         string | null
  quantidade:      number | null
  valor_unitario:  number | null
  valor_total:     number
  created_at:      string
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
      radar_fontes:              TableDef<RadarFonte>
      radar_resultados:          TableDef<RadarResultado>
      cotas_cooperado:           TableDef<CotaCooperado>
      cotas_integralizacao:      TableDef<CotaIntegralizacao>
      loja_fornecedores:         TableDef<LojaFornecedor>
      loja_clientes:             TableDef<LojaCliente>
      loja_produtos:             TableDef<LojaProduto>
      loja_lotes:                TableDef<LojaLote>
      loja_caixas:               TableDef<LojaCaixa>
      loja_vendas:               TableDef<LojaVenda>
      loja_venda_itens:          TableDef<LojaVendaItem>
      loja_compras:              TableDef<LojaCompra>
      loja_compra_itens:         TableDef<LojaCompraItem>
      loja_estoque_movimentos:   TableDef<LojaEstoqueMovimento>
      loja_pedidos_online:       TableDef<LojaPedidoOnline>
      loja_pedido_itens:         TableDef<LojaPedidoItem>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plano_contas:              TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      partidas:                  TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exercicios_contabeis:      TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comentarios_contabeis:     TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      escritorios_contabeis:     TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contador_org:              TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plano_contas_externo:      TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      de_para_contas:            TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nfe_importadas:            TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nfe_itens:                 TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      configuracoes_contabeis:   TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fechamentos_exercicio:     TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      livro_diario:              TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      distribuicao_sobras:       TableDef<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exportacoes_contabeis:     TableDef<any>
      configuracoes_sistema:     TableDef<any>
    }
    Views:          { [_ in never]: never }
    Functions:      { [_ in never]: never }
    Enums:          { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}