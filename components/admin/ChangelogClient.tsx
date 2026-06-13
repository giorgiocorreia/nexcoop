'use client'

import { useState, useTransition } from 'react'
import { Btn } from '@/components/ui/Btn'
import { buscarChangelog } from '@/lib/changelog/actions'
import type { ChangelogEntry } from '@/types/database'

interface Props {
  entriesIniciais: ChangelogEntry[]
  totalInicial: number
  modulosDisponiveis: string[]
}

const POR_PAGINA = 10

function fmtData(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function ChangelogClient({ entriesIniciais, totalInicial, modulosDisponiveis }: Props) {
  const [entries, setEntries]       = useState<ChangelogEntry[]>(entriesIniciais)
  const [total, setTotal]           = useState(totalInicial)
  const [pagina, setPagina]         = useState(1)
  const [modulo, setModulo]         = useState('')
  const [data, setData]             = useState('')
  const [isPending, startTransition] = useTransition()

  function aplicarFiltros(novoModulo: string, novaData: string) {
    setModulo(novoModulo)
    setData(novaData)
    setPagina(1)
    startTransition(async () => {
      const res = await buscarChangelog({
        modulo: novoModulo || undefined,
        data:   novaData   || undefined,
        pagina: 1,
        porPagina: POR_PAGINA,
      })
      setEntries(res.entries)
      setTotal(res.total)
    })
  }

  function carregarMais() {
    const proxPagina = pagina + 1
    startTransition(async () => {
      const res = await buscarChangelog({
        modulo: modulo || undefined,
        data:   data   || undefined,
        pagina: proxPagina,
        porPagina: POR_PAGINA,
      })
      setEntries(prev => [...prev, ...res.entries])
      setTotal(res.total)
      setPagina(proxPagina)
    })
  }

  const temMais = entries.length < total

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
          Histórico de mudanças
        </h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Registro de novidades e correções da plataforma NexCoop
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
        <select
          value={modulo}
          onChange={e => aplicarFiltros(e.target.value, data)}
          style={selStyle}
        >
          <option value="">Todos os módulos</option>
          {modulosDisponiveis.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <input
          type="date"
          value={data}
          onChange={e => aplicarFiltros(modulo, e.target.value)}
          style={selStyle}
        />

        {(modulo || data) && (
          <button
            onClick={() => aplicarFiltros('', '')}
            style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            Limpar filtros ×
          </button>
        )}
      </div>

      {/* Lista */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e3dc', color: '#6b7280' }}>
          {isPending ? 'Carregando…' : 'Nenhuma entrada encontrada.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {entries.map(entry => (
            <div
              key={entry.id}
              style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                  <i className="ti ti-calendar" style={{ marginRight: '4px', fontSize: '13px' }} />
                  {fmtData(entry.data)}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: '600', color: '#374151',
                  background: '#f3f4f6', border: '1px solid #e5e7eb',
                  padding: '2px 10px', borderRadius: '99px',
                }}>
                  {entry.modulo}
                </span>
              </div>

              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(entry.itens as string[]).map((item, i) => (
                  <li key={i} style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Carregar mais */}
      {temMais && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <Btn
            variante="cinza"
            tamanho="md"
            icone="ti-chevron-down"
            onClick={carregarMais}
            disabled={isPending}
          >
            {isPending ? 'Carregando…' : `Carregar mais (${total - entries.length} restantes)`}
          </Btn>
        </div>
      )}
    </div>
  )
}

const selStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e5e3dc',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#fff',
  color: '#1a1a1a',
}
