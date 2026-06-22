'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { confirmarComposicaoLote, fecharLote, criarVendaExterna } from '../actions'
import { fmt } from '@/lib/fmt'

export default function LoteDetalhe({ lote, entregasDoLote, entregasDisponiveis, compradores }: {
  lote: any
  entregasDoLote: any[]
  entregasDisponiveis: any[]
  compradores: any[]
}) {
  const router = useRouter()
  const fatorSaca: number = lote.produtos?.fator_saca ?? 60

  const todasEntregas = useMemo(() => [
    ...entregasDoLote.map((e: any) => ({ ...e, _noLote: true })),
    ...entregasDisponiveis.map((e: any) => ({ ...e, _noLote: false })),
  ], [entregasDoLote, entregasDisponiveis])

  const [selecionados, setSelecionados] = useState<Set<string>>(
    new Set(entregasDoLote.map((e: any) => e.id))
  )

  const kpis = useMemo(() => {
    const sel = todasEntregas.filter(e => selecionados.has(e.id))
    const pesoTotal  = sel.reduce((acc, e) => acc + (e.quantidade_produto ?? 0), 0)
    const valorTotal = sel.reduce((acc, e) => acc + (e.valor_financeiro ?? 0), 0)
    const sacas      = Math.floor(pesoTotal / fatorSaca)
    const resto      = pesoTotal % fatorSaca
    const precoMedio = pesoTotal > 0 ? valorTotal / pesoTotal : 0
    return { pesoTotal, valorTotal, sacas, resto, precoMedio, qtd: sel.length }
  }, [selecionados, todasEntregas, fatorSaca])

  const [mostrarVenda, setMostrarVenda] = useState(false)
  const [compradorId, setCompradorId]   = useState('')
  const [precoKg, setPrecoKg]           = useState('')
  const [salvando, setSalvando]         = useState(false)

  function toggleTodos(marcar: boolean) {
    setSelecionados(marcar ? new Set(todasEntregas.map(e => e.id)) : new Set())
  }

  function toggleEntrega(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSalvarComposicao() {
    setSalvando(true)
    try {
      await confirmarComposicaoLote(
        lote.id,
        Array.from(selecionados),
        entregasDoLote.map((e: any) => e.id)
      )
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleFecharLote() {
    if (!confirm('Fechar o lote? Após fechar, as entregas não poderão ser alteradas.')) return
    await fecharLote(lote.id)
    router.refresh()
  }

  async function handleCriarVenda() {
    if (!compradorId || !precoKg) { alert('Preencha comprador e preço/kg.'); return }
    setSalvando(true)
    try {
      const venda = await criarVendaExterna({
        loteId:       lote.id,
        compradorId,
        dataVenda:    new Date().toISOString().split('T')[0],
        quantidadeKg: lote.peso_total_kg,
        precoKg:      parseFloat(precoKg),
      })
      router.push(`/comercializacao/lotes/${lote.id}/nfe?venda=${venda.id}`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const loteFechado = lote.status !== 'aberto'
  const cardAzul: React.CSSProperties = { background: '#E6F1FB', borderRadius: 12, padding: '1rem', minWidth: 140 }

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/comercializacao/lotes')}
          style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}
        >
          ← Lotes
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Lote {lote.codigo}</h1>
            <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
              {lote.produto_descricao ?? lote.produtos?.nome ?? '—'}
              {lote.safras ? ` · Safra ${lote.safras.ano}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!loteFechado && (
              <>
                <button
                  onClick={handleSalvarComposicao}
                  disabled={salvando}
                  style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                >
                  Salvar composição
                </button>
                <button
                  onClick={handleFecharLote}
                  style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#92400e', color: '#fff', cursor: 'pointer' }}
                >
                  Fechar lote
                </button>
              </>
            )}
            {lote.status === 'em_venda' && !mostrarVenda && (
              <button
                onClick={() => setMostrarVenda(true)}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', cursor: 'pointer' }}
              >
                Emitir NF-e de saída
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={cardAzul}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', marginBottom: 4 }}>Peso total</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#042C53' }}>{fmt.peso(kpis.pesoTotal)}</div>
          <div style={{ fontSize: 12, color: '#185FA5', marginTop: 2 }}>
            {kpis.sacas} sacas{kpis.resto > 0.001 ? ` + ${fmt.peso(kpis.resto)}` : ''}
          </div>
        </div>
        <div style={cardAzul}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', marginBottom: 4 }}>Entradas</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#042C53' }}>{kpis.qtd}</div>
          <div style={{ fontSize: 12, color: '#185FA5', marginTop: 2 }}>registros selecionados</div>
        </div>
        <div style={cardAzul}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', marginBottom: 4 }}>Custo total</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#042C53' }}>{fmt.moeda(kpis.valorTotal)}</div>
          <div style={{ fontSize: 12, color: '#185FA5', marginTop: 2 }}>preço médio {fmt.moeda(kpis.precoMedio)}/kg</div>
        </div>
        {mostrarVenda && precoKg && !isNaN(parseFloat(precoKg)) && (
          <div style={{ ...cardAzul, background: '#E1F5EE' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#0F6E56', textTransform: 'uppercase', marginBottom: 4 }}>Resultado bruto</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: '#04342C' }}>
              {fmt.moeda((parseFloat(precoKg) * kpis.pesoTotal) - kpis.valorTotal)}
            </div>
            <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 2 }}>
              {fmt.moeda(parseFloat(precoKg))}/kg negociado
            </div>
          </div>
        )}
      </div>

      {/* Painel de venda */}
      {mostrarVenda && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem' }}>Venda do lote</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Comprador</label>
              <select
                value={compradorId}
                onChange={e => setCompradorId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, minWidth: 200 }}
              >
                <option value="">Selecione...</option>
                {compradores.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Valor negociado (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={precoKg}
                onChange={e => setPrecoKg(e.target.value)}
                placeholder="0,00"
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, width: 120 }}
              />
            </div>
            <button
              onClick={handleCriarVenda}
              disabled={salvando || !compradorId || !precoKg}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#92400e', color: '#fff', cursor: 'pointer', opacity: (salvando || !compradorId || !precoKg) ? 0.6 : 1 }}
            >
              Avançar para NF-e →
            </button>
          </div>
        </div>
      )}

      {/* Tabela de entregas */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e3dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            Entregas {loteFechado ? 'do lote' : 'disponíveis'}
          </span>
          {!loteFechado && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => toggleTodos(true)}  style={{ fontSize: 12, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer' }}>Marcar todas</button>
              <span style={{ color: '#ccc' }}>|</span>
              <button onClick={() => toggleTodos(false)} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Desmarcar todas</button>
            </div>
          )}
        </div>

        {todasEntregas.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontSize: 13 }}>
            Nenhuma entrega disponível.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f7f4' }}>
                {!loteFechado && <th style={{ width: 40, padding: '10px 16px' }}></th>}
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#555' }}>Produtor</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#555' }}>Data</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#555' }}>Kg</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#555' }}>Sacas</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#555' }}>Valor pago</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, color: '#555' }}>NF-e entrada</th>
              </tr>
            </thead>
            <tbody>
              {todasEntregas.map((entrega: any) => {
                const sel    = selecionados.has(entrega.id)
                const sacas  = Math.floor((entrega.quantidade_produto ?? 0) / fatorSaca)
                const resto  = (entrega.quantidade_produto ?? 0) % fatorSaca
                return (
                  <tr
                    key={entrega.id}
                    onClick={() => !loteFechado && toggleEntrega(entrega.id)}
                    style={{
                      borderTop: '1px solid #f0ede8',
                      background: sel ? '#f0faf5' : '#fff',
                      cursor: loteFechado ? 'default' : 'pointer',
                      opacity: loteFechado || sel ? 1 : 0.6,
                    }}
                  >
                    {!loteFechado && (
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleEntrega(entrega.id)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                    )}
                    <td style={{ padding: '10px 16px' }}>{(entrega.contas_produtor as any)?.produtores?.nome ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#666' }}>{fmt.data(entrega.created_at)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>{fmt.peso(entrega.quantidade_produto)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#666' }}>
                      {sacas > 0 ? `${sacas} sc` : ''}{resto > 0.001 ? ` +${fmt.peso(resto)}` : ''}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>{fmt.moeda(entrega.valor_financeiro)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      {entrega.chave_nfe_entrada ? (
                        <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>✓ Com NF-e</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#E07B30' }}>Sem NF-e</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
