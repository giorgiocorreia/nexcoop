// Consulta pública da carteirinha de identificação do filiado. Sempre
// createAdminClient() — a página /v/{codigo} é servida pro visitante anônimo
// (regra 2 do CLAUDE.md) e o role `anon` não recebe nenhuma policy na tabela
// cooperado_carteirinhas (ver nota no topo da migration 089). Mesmo padrão de
// lib/site/queries.ts.

import { createAdminClient } from '@/lib/supabase/admin'
import type { StatusCooperado, TipoOrganizacao } from '@/types/database'

// Mesmo formato do CHECK da migration (^[A-Za-z0-9]{12}$) — valida ANTES de
// ir ao banco pra não gastar query com lixo de URL adulterada.
const REGEX_CODIGO = /^[A-Za-z0-9]{12}$/

export interface CarteirinhaVerificacao {
  codigo: string
  via: number
  emitidaEm: string
  validaAte: string | null
  revogadaEm: string | null
  cooperado: {
    nome: string
    numeroMatricula: string | null
    cpf: string | null
    status: StatusCooperado
    dataAdmissao: string | null
    fotoUrl: string | null
  }
  organizacao: {
    nome: string
    logoUrl: string | null
    corPrimaria: string | null
    tipo: TipoOrganizacao
  }
  slugSite: string | null
}

// Formato bruto retornado pelo embed do PostgREST — o tipo `Database` deste
// projeto declara Relationships: never[] (ver types/database.ts), então o
// embed não é tipado automaticamente; seguimos o mesmo padrão de cast de
// lib/site/queries.ts (buscarCotacoesVitrine).
interface LinhaCarteirinha {
  codigo: string
  via: number
  emitida_em: string
  valida_ate: string | null
  revogada_em: string | null
  organizacao_id: string
  cooperados: {
    nome_completo: string
    numero_matricula: string | null
    cpf: string | null
    status: StatusCooperado
    data_admissao: string | null
    foto_url: string | null
  } | null
  organizacoes: {
    nome: string
    logo_url: string | null
    cor_primaria: string | null
    tipo: TipoOrganizacao
  } | null
}

export async function buscarCarteirinhaPorCodigo(codigo: string): Promise<CarteirinhaVerificacao | null> {
  if (!REGEX_CODIGO.test(codigo)) return null

  const admin = createAdminClient()

  // Só as colunas necessárias pra exibição pública — nada de select('*') em
  // cooperados/organizacoes, é PII indo pra uma página sem autenticação.
  const { data, error } = await admin
    .from('cooperado_carteirinhas')
    .select(`
      codigo, via, emitida_em, valida_ate, revogada_em, organizacao_id,
      cooperados ( nome_completo, numero_matricula, cpf, status, data_admissao, foto_url ),
      organizacoes ( nome, logo_url, cor_primaria, tipo )
    `)
    .eq('codigo', codigo)
    .maybeSingle()

  if (error || !data) return null

  const linha = data as unknown as LinhaCarteirinha
  if (!linha.cooperados || !linha.organizacoes) return null

  // Slug do site próprio (se existir) — só pra referência/consistência com a
  // URL que gerou o QR; a busca em si já veio pelo código, não pelo slug.
  const { data: siteConfig } = await admin
    .from('site_config')
    .select('slug')
    .eq('organizacao_id', linha.organizacao_id)
    .maybeSingle()

  return {
    codigo: linha.codigo,
    via: linha.via,
    emitidaEm: linha.emitida_em,
    validaAte: linha.valida_ate,
    revogadaEm: linha.revogada_em,
    cooperado: {
      nome: linha.cooperados.nome_completo,
      numeroMatricula: linha.cooperados.numero_matricula,
      cpf: linha.cooperados.cpf,
      status: linha.cooperados.status,
      dataAdmissao: linha.cooperados.data_admissao,
      fotoUrl: linha.cooperados.foto_url,
    },
    organizacao: {
      nome: linha.organizacoes.nome,
      logoUrl: linha.organizacoes.logo_url,
      corPrimaria: linha.organizacoes.cor_primaria,
      tipo: linha.organizacoes.tipo,
    },
    slugSite: (siteConfig as { slug: string } | null)?.slug ?? null,
  }
}
