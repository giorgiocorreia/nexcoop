// Funções puras (sem I/O) do relatório de saídas de caixa da Comercialização —
// cálculo de intervalo do mês, tipos de saída, agregação e filtro. Reutilizadas
// pela server action do relatório (saidas-caixa.ts), pelo resumo do dashboard
// e pelo gerador de PDF. Fica fora de arquivo "use server" porque precisa ser
// importável direto no client (gerador de PDF roda no navegador, filtro roda
// na tela em tempo real).

// Todas as fontes que representam dinheiro de fato saindo do caixa da
// Comercialização. Critério: "o saldo físico/Pix do caixa diminuiu". Por isso
// NÃO inclui ajuste_produto (só mexe em kg, sem valor_financeiro) nem entrega/
// conversao (não tiram dinheiro — conversao só troca kg por saldo em conta,
// quem tira dinheiro de fato é o saque). ajuste_financeiro_debito é mantido
// por cobertura futura: hoje nenhum ponto do código insere ajuste_financeiro
// negativo (o único emissor, pagarDistribuicao, sempre credita), mas o tipo
// existe no enum do banco e, se um dia alguém debitar saldo por ajuste, é
// dinheiro saindo do caixa e precisa aparecer aqui.
export type TipoSaidaCaixa =
  | 'saque_especie'
  | 'saque_pix'
  | 'saida_avulsa'
  | 'sangria'
  | 'ajuste_financeiro_debito'

export const TIPOS_SAIDA_CAIXA: { valor: TipoSaidaCaixa; label: string }[] = [
  { valor: 'saque_especie',            label: 'Saque produtor (espécie)' },
  { valor: 'saque_pix',                label: 'Saque produtor (Pix)' },
  { valor: 'saida_avulsa',             label: 'Saída avulsa' },
  { valor: 'sangria',                  label: 'Sangria' },
  { valor: 'ajuste_financeiro_debito', label: 'Ajuste financeiro (débito)' },
]

export function labelTipoSaida(tipo: TipoSaidaCaixa): string {
  return TIPOS_SAIDA_CAIXA.find(t => t.valor === tipo)?.label ?? tipo
}

export type SaidaCaixaLinha = {
  id: string
  data: string
  tipo: TipoSaidaCaixa
  descricao: string        // texto amigável pra exibição (produtor, motivo da sangria, descrição da saída avulsa...)
  produtor_nome: string | null
  forma_pagamento: 'especie' | 'pix'
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

export function agregarSaidas(linhas: SaidaCaixaLinha[]) {
  const total = linhas.reduce((acc, l) => acc + l.valor, 0)
  const totalEspecie = linhas
    .filter(l => l.forma_pagamento === 'especie')
    .reduce((acc, l) => acc + l.valor, 0)
  const totalPix = linhas
    .filter(l => l.forma_pagamento === 'pix')
    .reduce((acc, l) => acc + l.valor, 0)
  const porTipo = TIPOS_SAIDA_CAIXA.reduce((acc, t) => {
    acc[t.valor] = linhas.filter(l => l.tipo === t.valor).reduce((s, l) => s + l.valor, 0)
    return acc
  }, {} as Record<TipoSaidaCaixa, number>)
  return { total, totalEspecie, totalPix, count: linhas.length, porTipo }
}

// Filtros aditivos e combináveis (padrão "+ Filtro" da tela). Cada campo
// ausente/vazio = sem restrição nesse eixo — um chip recém-adicionado sem
// seleção ainda não esconde nada, evita lista vazia por engano.
export type FiltrosSaidaCaixa = {
  tipos?: TipoSaidaCaixa[]
  forma?: 'especie' | 'pix'
  produtor?: string
}

export function filtrarSaidasCaixa(linhas: SaidaCaixaLinha[], filtros: FiltrosSaidaCaixa): SaidaCaixaLinha[] {
  return linhas.filter(l => {
    if (filtros.tipos && filtros.tipos.length > 0 && !filtros.tipos.includes(l.tipo)) return false
    if (filtros.forma && l.forma_pagamento !== filtros.forma) return false
    if (filtros.produtor && filtros.produtor.trim()) {
      const termo = filtros.produtor.trim().toLowerCase()
      if (!l.produtor_nome || !l.produtor_nome.toLowerCase().includes(termo)) return false
    }
    return true
  })
}

export function fmtRealSaida(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtDataSaida(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
}

export function mesLabel(mes: number, ano: number) {
  return `${NOMES_MESES[mes - 1]}/${ano}`
}
