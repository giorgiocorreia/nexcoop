// lib/utils/cpf.ts
// Validação de CPF com verificação de dígitos verificadores

export function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false // sequências inválidas (00000000000, etc)

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[10])) return false

  return true
}

export function cpfInvalidoMsg(cpf: string): string | null {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length === 0) return 'CPF obrigatório'
  if (digits.length !== 11) return 'CPF deve ter 11 dígitos'
  if (!validarCPF(cpf)) return 'CPF inválido'
  return null
}
