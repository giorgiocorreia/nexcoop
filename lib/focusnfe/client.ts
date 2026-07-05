// lib/focusnfe/client.ts
// Cliente HTTP para a API Focus NFe
// Docs: https://developer.focusnfe.com.br/docs/

export type FocusModulo = 'loja' | 'comercializacao'

function resolveAmbiente(modulo?: FocusModulo): 'producao' | 'homologacao' {
  if (modulo === 'loja') {
    const env = process.env.FOCUSNFE_AMBIENTE_LOJA ?? process.env.FOCUSNFE_AMBIENTE
    return env === 'producao' ? 'producao' : 'homologacao'
  }
  if (modulo === 'comercializacao') {
    const env = process.env.FOCUSNFE_AMBIENTE_COMERCIALIZACAO ?? process.env.FOCUSNFE_AMBIENTE
    return env === 'producao' ? 'producao' : 'homologacao'
  }
  return process.env.FOCUSNFE_AMBIENTE === 'producao' ? 'producao' : 'homologacao'
}

export function getFocusConfig(modulo?: FocusModulo) {
  const ambiente = resolveAmbiente(modulo)
  const baseUrl = ambiente === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br'
  const token = ambiente === 'producao'
    ? process.env.FOCUSNFE_TOKEN_PRODUCAO
    : process.env.FOCUSNFE_TOKEN_HOMOLOGACAO
  if (!token) {
    throw new Error('Token Focus NFe não configurado. Verifique FOCUSNFE_TOKEN_HOMOLOGACAO ou FOCUSNFE_TOKEN_PRODUCAO.')
  }
  return { ambiente, baseUrl, token }
}

/** Fallback global — prefira getFocusConfig(modulo).baseUrl */
export const FOCUS_BASE_URL = process.env.FOCUSNFE_AMBIENTE === 'producao'
  ? 'https://api.focusnfe.com.br'
  : 'https://homologacao.focusnfe.com.br'

export function urlCompleta(path?: string, modulo?: FocusModulo): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  const { baseUrl } = getFocusConfig(modulo)
  return `${baseUrl}${path}`
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function authHeader(modulo?: FocusModulo): string {
  const { token } = getFocusConfig(modulo)
  const encoded = Buffer.from(`${token}:`).toString('base64')
  return `Basic ${encoded}`
}

export function getFocusAuthHeader(modulo?: FocusModulo): string {
  return authHeader(modulo)
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Focus NFe erro ${res.status}: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    throw new Error(`Focus NFe erro ${res.status}: ${JSON.stringify(data)}`)
  }
  return data as T
}

export async function focusPost<T>(path: string, body: object, modulo?: FocusModulo): Promise<T> {
  const { baseUrl } = getFocusConfig(modulo)
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(modulo),
    },
    body: JSON.stringify(body),
  })
  return parseResponse<T>(res)
}

export async function focusGet<T>(path: string, modulo?: FocusModulo): Promise<T> {
  const { baseUrl } = getFocusConfig(modulo)
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { 'Authorization': authHeader(modulo) },
  })
  return parseResponse<T>(res)
}

export async function focusDelete<T>(path: string, body?: object, modulo?: FocusModulo): Promise<T> {
  const { baseUrl } = getFocusConfig(modulo)
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(modulo),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return parseResponse<T>(res)
}