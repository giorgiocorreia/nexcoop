// Funções puras da carteirinha de identificação do filiado (sem I/O) — NUNCA
// leva 'use server' (regra 5 do CLAUDE.md). Consultas ao banco ficam em
// lib/carteirinha/queries.ts, escrita em lib/carteirinha/actions.ts.

import { randomBytes } from 'crypto'
import type { StatusCooperado } from '@/types/database'

// Domínio raiz do produto — mesmo valor de DOMINIO_BASE no middleware.ts.
// Duplicado de propósito: middleware.ts não pode ser importado por código de
// lib (edge runtime x node runtime), então replicamos a constante aqui em
// vez de importar.
export const DOMINIO_BASE = 'nexcoop.com.br'

const ALFABETO_CODIGO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const TAMANHO_CODIGO = 12

// Gera o token opaco de verificação (12 alfanuméricos, formato exigido pelo
// CHECK da migration 089: ^[A-Za-z0-9]{12}$). Usa crypto.randomBytes — NUNCA
// Math.random, é um token de segurança que vai exposto na URL pública do QR.
// Rejeita bytes que ultrapassem o maior múltiplo de 62 abaixo de 256 pra
// evitar viés de módulo (bytes 248-255 descartados).
export function gerarCodigoCarteirinha(): string {
  const LIMITE = 256 - (256 % ALFABETO_CODIGO.length)
  let codigo = ''
  while (codigo.length < TAMANHO_CODIGO) {
    const bytes = randomBytes(TAMANHO_CODIGO)
    for (let i = 0; i < bytes.length && codigo.length < TAMANHO_CODIGO; i++) {
      const b = bytes[i]
      if (b >= LIMITE) continue // descarta pra não enviesar o resultado
      codigo += ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]
    }
  }
  return codigo
}

// Liga/desliga o uso de subdomínio por org na URL do QR.
//
// FALSE desde 24/07/2026 — o wildcard *.nexcoop.com.br NÃO existe em DNS
// (coopaibi.nexcoop.com.br não resolve) e domínio wildcard na Vercel exige
// plano Pro; o projeto está no Hobby. Com true, o QR aponta pra um host
// inexistente e a leitura dá "link quebrado".
//
// Para religar quando houver wildcard configurado: mude para true. Nenhuma
// carteirinha precisa ser reemitida — o `codigo` continua o mesmo e a rota
// /v/[codigo] é global (app/v/, fora do grupo do módulo Site), atendendo
// nos dois hosts. Só os cartões JÁ IMPRESSOS carregam a URL antiga no QR e
// precisariam ser reimpressos.
const USAR_SUBDOMINIO_POR_ORG = false

// Monta a URL pública de verificação (o que vai no QR code). O slug segue
// sendo recebido pra não mudar a assinatura em todos os chamadores quando o
// subdomínio for religado.
export function montarUrlVerificacao(codigo: string, slugSite: string | null): string {
  const host = (USAR_SUBDOMINIO_POR_ORG && slugSite)
    ? `${slugSite}.${DOMINIO_BASE}`
    : DOMINIO_BASE
  return `https://${host}/v/${codigo}`
}

// Mascara o CPF pra exibição pública — só o miolo (6 dígitos do meio) fica
// visível, o suficiente pra conferência visual sem expor o CPF completo.
// '12345678901' → '***.456.789-**'
export function mascararCpf(cpf: string | null): string {
  const digitos = (cpf ?? '').replace(/\D/g, '')
  if (digitos.length !== 11) return '***.***.***-**'
  const grupo2 = digitos.slice(3, 6)
  const grupo3 = digitos.slice(6, 9)
  return `***.${grupo2}.${grupo3}-**`
}

export type SituacaoCarteirinha = 'valida' | 'invalida' | 'expirada' | 'revogada'

export interface StatusCarteirinha {
  situacao: SituacaoCarteirinha
  rotulo: string       // "ATIVO" / "NÃO ATIVO" — o que aparece no semáforo
  detalhe: string | null
}

// Deriva o status exibido na verificação pública a partir do vínculo AO VIVO
// do cooperado — a carteirinha em si não "congela" nada (ver comentário da
// migration 089). Ordem de precedência: revogada > expirada > status do
// cooperado.
//
// Decisão do Giorgio (24/07/2026): 'inadimplente' conta como VÁLIDA/ATIVO —
// vínculo é vínculo, situação financeira não é exposta a terceiros que
// escaneiam o QR. Não adicionar nenhum detalhe sobre pendência financeira aqui.
export function resolverStatusCarteirinha(
  status: StatusCooperado,
  validaAte: string | null,
  revogadaEm: string | null
): StatusCarteirinha {
  if (revogadaEm) {
    return { situacao: 'revogada', rotulo: 'NÃO ATIVO', detalhe: 'Carteirinha revogada' }
  }

  if (validaAte) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const vencimento = new Date(`${validaAte}T00:00:00`)
    if (vencimento.getTime() < hoje.getTime()) {
      return { situacao: 'expirada', rotulo: 'NÃO ATIVO', detalhe: 'Carteirinha expirada' }
    }
  }

  switch (status) {
    case 'ativo':
    case 'inadimplente':
      return { situacao: 'valida', rotulo: 'ATIVO', detalhe: null }
    case 'probatorio':
      return { situacao: 'valida', rotulo: 'ATIVO', detalhe: 'Em período probatório' }
    case 'proposta':
    case 'suspenso':
    case 'demitido':
    case 'excluido':
    default:
      return { situacao: 'invalida', rotulo: 'NÃO ATIVO', detalhe: null }
  }
}
