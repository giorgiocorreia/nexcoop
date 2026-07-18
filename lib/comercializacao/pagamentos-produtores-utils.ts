// Funções puras (sem I/O) do relatório de pagamentos a produtores — cálculo de
// intervalo do mês e agregações. Reutilizadas pela server action do relatório
// (pagamentos-produtores.ts), pelo resumo do dashboard e pelo gerador de PDF.
// Fica fora de arquivo "use server" porque precisa ser importável direto no
// client (gerador de PDF roda no navegador).

export type FormaPagamentoProdutor = 'especie' | 'pix'

export type PagamentoProdutorLinha = {
  id: string
  data: string
  produtor_nome: string
  produtor_cpf: string | null
  forma_pagamento: FormaPagamentoProdutor
  valor: number
  observacoes: string | null
}

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// "Meia-noite em Brasília" (UTC-3, fuso fixo, sem horário de verão) equivale
// a 03:00 UTC — mesmo critério usado em getDashboardComercializacao pro corte
// do dia. Aqui aplicado ao primeiro dia do mês (início) e primeiro dia do mês
// seguinte (fim, exclusivo).
export function calcularIntervaloMes(mes: number, ano: number): { inicioIso: string; fimIso: string } {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1, 3, 0, 0))
  const fim = new Date(Date.UTC(ano, mes, 1, 3, 0, 0))
  return { inicioIso: inicio.toISOString(), fimIso: fim.toISOString() }
}

export function agregarPagamentos(linhas: PagamentoProdutorLinha[]) {
  const total = linhas.reduce((acc, l) => acc + l.valor, 0)
  const totalEspecie = linhas
    .filter(l => l.forma_pagamento === 'especie')
    .reduce((acc, l) => acc + l.valor, 0)
  const totalPix = linhas
    .filter(l => l.forma_pagamento === 'pix')
    .reduce((acc, l) => acc + l.valor, 0)
  return { total, totalEspecie, totalPix, count: linhas.length }
}

export function fmtRealPagamento(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtDataPagamento(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
}

export function mesLabel(mes: number, ano: number) {
  return `${NOMES_MESES[mes - 1]}/${ano}`
}
