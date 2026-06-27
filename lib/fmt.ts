export const fmt = {
  peso: (v: number | null | undefined) =>
    `${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`,

  moeda: (v: number | null | undefined) =>
    (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),

  num: (v: number | null | undefined, casas = 2) =>
    (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }),

  data: (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString('pt-BR') : '—',

  pct: (v: number | null | undefined) =>
    `${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`,
}
