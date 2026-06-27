// lib/focusnfe/client.ts
// Cliente HTTP para a API Focus NFe
// Docs: https://developer.focusnfe.com.br/docs/

export const FOCUS_BASE_URL = process.env.FOCUSNFE_AMBIENTE === 'producao'
  ? 'https://api.focusnfe.com.br'
  : 'https://homologacao.focusnfe.com.br'

function getToken(): string {
  const token = process.env.FOCUSNFE_AMBIENTE === 'producao'
    ? process.env.FOCUSNFE_TOKEN_PRODUCAO
    : process.env.FOCUSNFE_TOKEN_HOMOLOGACAO
  if (!token) throw new Error('Token Focus NFe não configurado. Verifique FOCUSNFE_TOKEN_HOMOLOGACAO ou FOCUSNFE_TOKEN_PRODUCAO.')
  return token
}

// Authorization: Basic <token:> (senha vazia, base64)
function authHeader(): string {
  const token = getToken()
  const encoded = Buffer.from(`${token}:`).toString('base64')
  return `Basic ${encoded}`
}

// Parse seguro — evita crash quando a Focus retorna texto/HTML em vez de JSON
async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    // Focus retornou texto não-JSON (ex: "HTTP Basic: Access denied.")
    throw new Error(`Focus NFe erro ${res.status}: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    throw new Error(`Focus NFe erro ${res.status}: ${JSON.stringify(data)}`)
  }
  return data as T
}

export async function focusPost<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${FOCUS_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(),
    },
    body: JSON.stringify(body),
  })
  return parseResponse<T>(res)
}

export async function focusGet<T>(path: string): Promise<T> {
  const res = await fetch(`${FOCUS_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': authHeader(),
    },
  })
  return parseResponse<T>(res)
}

export async function focusDelete<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${FOCUS_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return parseResponse<T>(res)
}