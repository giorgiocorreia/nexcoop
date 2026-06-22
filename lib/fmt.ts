export const fmt = {
  peso: (v: number | null | undefined) =>
    `${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`,

  moeda: (v: number | null | undefined) =>
    (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),

  data: (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString('pt-BR') : '—',
}
