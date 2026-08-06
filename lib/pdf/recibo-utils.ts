/**
 * Utilitários puros do gerador de recibos — sem I/O, sem Supabase.
 * Consumido tanto pelo client (modal da tela Impressos) quanto pelo
 * gerador de PDF. NÃO mover para arquivo "use server" (Regra 5).
 */

export type TipoRecibo =
  | 'prestacao_servico'
  | 'pagamento'
  | 'aluguel'
  | 'doacao'
  | 'adiantamento'
  | 'diaria_rural'
  | 'outros'

/** Quem ficou com o dinheiro — define o texto impresso no corpo do recibo. */
export type DirecaoRecibo = 'recebemos' | 'pagamos'

export const TIPOS_RECIBO: { valor: TipoRecibo; label: string }[] = [
  { valor: 'prestacao_servico', label: 'Prestação de serviço' },
  { valor: 'pagamento',         label: 'Pagamento / Quitação' },
  { valor: 'aluguel',           label: 'Aluguel' },
  { valor: 'doacao',            label: 'Doação' },
  { valor: 'adiantamento',      label: 'Adiantamento' },
  { valor: 'diaria_rural',      label: 'Diária / Mão de obra rural' },
  { valor: 'outros',            label: 'Outros' },
]

/**
 * Direção padrão de cada tipo. 'pagamos' = a cooperativa pagou e a pessoa
 * assina confirmando que recebeu (caso da prestação de serviço, diária,
 * adiantamento). 'recebemos' = a cooperativa recebeu da pessoa.
 * O usuário pode inverter no modal; o valor escolhido é gravado em
 * recibos.direcao para a reimpressão sair idêntica.
 */
export const DIRECAO_PADRAO: Record<TipoRecibo, DirecaoRecibo> = {
  prestacao_servico: 'pagamos',
  pagamento:         'recebemos',
  aluguel:           'recebemos',
  doacao:            'recebemos',
  adiantamento:      'pagamos',
  diaria_rural:      'pagamos',
  outros:            'recebemos',
}

/** Texto sugerido no campo Descrição — apenas ponto de partida, é editável. */
export const DESCRICAO_SUGERIDA: Record<TipoRecibo, string> = {
  prestacao_servico: 'Referente à prestação de serviços de ',
  pagamento:         'Referente ao pagamento de ',
  aluguel:           'Referente ao aluguel de ',
  doacao:            'Referente à doação de ',
  adiantamento:      'Referente a adiantamento de ',
  diaria_rural:      'Referente a diárias de mão de obra rural prestadas em ',
  outros:            'Referente a ',
}

export function labelTipo(tipo: TipoRecibo): string {
  return TIPOS_RECIBO.find(t => t.valor === tipo)?.label ?? 'Recibo'
}

/** Remove tudo que não for dígito. */
export function apenasDigitos(v: string): string {
  return (v ?? '').replace(/\D/g, '')
}

/** Aplica máscara de CPF (11) ou CNPJ (14). Fora desses tamanhos, devolve como veio. */
export function mascararDocumento(digitos: string): string {
  const d = apenasDigitos(digitos)
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return d
}

/** Validação de CPF pelos dígitos verificadores. */
export function cpfValido(valor: string): boolean {
  const cpf = apenasDigitos(valor)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const dv = (ate: number) => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10])
}

/** Validação de CNPJ pelos dígitos verificadores. */
export function cnpjValido(valor: string): boolean {
  const cnpj = apenasDigitos(valor)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const dv = (ate: number) => {
    let peso = ate - 7
    let soma = 0
    for (let i = 0; i < ate; i++) {
      soma += Number(cnpj[i]) * peso
      peso = peso === 2 ? 9 : peso - 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return dv(12) === Number(cnpj[12]) && dv(13) === Number(cnpj[13])
}

/** Aceita CPF (11 dígitos) ou CNPJ (14). Vazio é válido — o campo é opcional. */
export function documentoValido(valor: string): boolean {
  const d = apenasDigitos(valor)
  if (d.length === 0) return true
  if (d.length === 11) return cpfValido(d)
  if (d.length === 14) return cnpjValido(d)
  return false
}

// ── Valor por extenso ───────────────────────────────────────────────────────

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const DEZ_A_DEZENOVE = [
  'dez', 'onze', 'doze', 'treze', 'quatorze',
  'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta',
  'sessenta', 'setenta', 'oitenta', 'noventa',
]
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
]

/** Escreve um número de 1 a 999 por extenso. */
function trioPorExtenso(n: number): string {
  if (n === 100) return 'cem'

  const partes: string[] = []
  const c = Math.floor(n / 100)
  const resto = n % 100

  if (c > 0) partes.push(CENTENAS[c])

  if (resto >= 10 && resto <= 19) {
    partes.push(DEZ_A_DEZENOVE[resto - 10])
  } else {
    const d = Math.floor(resto / 10)
    const u = resto % 10
    if (d > 0) partes.push(DEZENAS[d])
    if (u > 0) partes.push(UNIDADES[u])
  }

  return partes.join(' e ')
}

/** Escreve um inteiro de 0 a 999.999.999 por extenso (sem "reais"). */
function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero'

  const milhoes = Math.floor(n / 1_000_000)
  const milhares = Math.floor((n % 1_000_000) / 1000)
  const unidades = n % 1000

  // Cada grupo guarda o próprio valor numérico porque a ligação com "e"
  // depende dele, não do texto.
  const grupos: { valor: number; texto: string }[] = []
  if (milhoes > 0) {
    grupos.push({ valor: milhoes, texto: `${trioPorExtenso(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}` })
  }
  if (milhares > 0) {
    // "mil", nunca "um mil"
    grupos.push({ valor: milhares, texto: milhares === 1 ? 'mil' : `${trioPorExtenso(milhares)} mil` })
  }
  if (unidades > 0) grupos.push({ valor: unidades, texto: trioPorExtenso(unidades) })

  if (grupos.length === 1) return grupos[0].texto

  // "e" antes do último grupo quando ele é < 100 ou centena redonda:
  // mil e duzentos / mil e vinte / um milhão e duzentos mil, mas
  // mil duzentos e trinta e quatro / dois mil trezentos e quarenta.
  const ultimo = grupos[grupos.length - 1]
  const anteriores = grupos.slice(0, -1).map(g => g.texto)
  const ligaComE = ultimo.valor < 100 || ultimo.valor % 100 === 0

  return ligaComE
    ? `${anteriores.join(', ')} e ${ultimo.texto}`
    : `${anteriores.join(', ')} ${ultimo.texto}`
}

/**
 * Valor monetário por extenso, como sai impresso no recibo.
 * Ex.: 1234.56 → "mil, duzentos e trinta e quatro reais e cinquenta e seis centavos"
 */
export function valorPorExtenso(valor: number): string {
  // Arredonda em centavos antes de separar, senão 0.615 vira 61 centavos
  const centavosTotais = Math.round((valor + Number.EPSILON) * 100)
  const inteiros = Math.floor(centavosTotais / 100)
  const centavos = centavosTotais % 100

  const partes: string[] = []

  if (inteiros > 0) {
    const extenso = inteiroPorExtenso(inteiros)
    // "um milhão DE reais", mas "um milhão e duzentos mil reais" — o "de" só
    // entra quando milhão/milhões é a última palavra (nada o segue).
    const de = /\bmilh(ão|ões)$/.test(extenso) ? 'de ' : ''
    partes.push(`${extenso} ${de}${inteiros === 1 ? 'real' : 'reais'}`)
  }
  if (centavos > 0) {
    partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  }
  if (partes.length === 0) return 'zero reais'

  return partes.join(' e ')
}

/** Formata em R$ sem depender de Intl no ambiente do pdf-lib. */
export function formatarMoeda(valor: number): string {
  const centavosTotais = Math.round((valor + Number.EPSILON) * 100)
  const inteiros = Math.floor(centavosTotais / 100)
  const centavos = centavosTotais % 100
  const milhar = String(inteiros).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${milhar},${String(centavos).padStart(2, '0')}`
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** "Salvador, 6 de agosto de 2026" — linha de local e data acima da assinatura. */
export function localEData(cidade: string, estado: string, data: Date): string {
  const local = [cidade, estado].filter(Boolean).join(' - ')
  return `${local}, ${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`
}

/**
 * Frase de abertura do recibo. É o que muda conforme a direção:
 * quem assina embaixo é sempre quem RECEBEU o dinheiro.
 */
export function fraseAbertura(params: {
  direcao: DirecaoRecibo
  pessoaNome: string
  pessoaDoc: string | null
  orgNome: string
  orgCnpj: string | null
  valor: number
}): string {
  const { direcao, pessoaNome, pessoaDoc, orgNome, orgCnpj, valor } = params
  const quantia = `a importância de ${formatarMoeda(valor)} (${valorPorExtenso(valor)})`

  if (direcao === 'recebemos') {
    const doc = pessoaDoc ? `, portador(a) do documento nº ${mascararDocumento(pessoaDoc)}` : ''
    return `Recebemos de ${pessoaNome}${doc}, ${quantia}.`
  }

  const doc = pessoaDoc ? `, portador(a) do documento nº ${mascararDocumento(pessoaDoc)}` : ''
  const cnpj = orgCnpj ? `, inscrita no CNPJ sob o nº ${mascararDocumento(orgCnpj)}` : ''
  return `Eu, ${pessoaNome}${doc}, recebi de ${orgNome}${cnpj}, ${quantia}.`
}

/** Quem assina a via — sempre quem recebeu o dinheiro. */
export function assinante(params: {
  direcao: DirecaoRecibo
  pessoaNome: string
  orgNome: string
}): string {
  return params.direcao === 'recebemos' ? params.orgNome : params.pessoaNome
}
