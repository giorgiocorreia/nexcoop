'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LojaFornecedor } from '@/types/database'
import type { LojaProdutoComFornecedor } from '@/lib/loja/actions'
import ProdutoModal from '@/components/loja/ProdutoModal'

const VERDE  = '#1D9E75'
const LARANJA = '#d97706'

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'view' | 'edit'; produto: LojaProdutoComFornecedor }

interface Props {
  produtos:      LojaProdutoComFornecedor[]
  fornecedores:  Pick<LojaFornecedor, 'id' | 'nome'>[]
  produtosComVencimento: Set<string>
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', fontSize: '13px', border: '1px solid #d5d3cc',
  borderRadius: '8px', background: '#fff', color: '#1a1a1a',
  outline: 'none', height: '36px', boxSizing: 'border-box',
}

function CardStat({ label, valor, cor, bg }: { label: string; valor: number; cor?: string; bg?: string }) {
  return (
    <div style={{ background: bg ?? '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '14px 18px' }}>
      <div style={{ fontSize: '22px', fontWeight: '700', color: cor ?? '#1a1a1a' }}>{valor}</div>
      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function ProdutosLista({ produtos, fornecedores, produtosComVencimento }: Props) {
  const router = useRouter()
  const [busca, setBusca]       = useState('')
  const [categoria, setCategoria] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [hovered, setHovered]   = useState<string | null>(null)
  const [modal, setModal]       = useState<ModalState>({ open: false })

  const categorias = useMemo(() => {
    const cats = new Set(produtos.map(p => p.categoria).filter(Boolean) as string[])
    return Array.from(cats).sort()
  }, [produtos])

  const estoqueBaixoIds = useMemo(() => {
    return new Set(
      produtos
        .filter(p => p.estoque_minimo != null && p.estoque_atual < p.estoque_minimo)
        .map(p => p.id)
    )
  }, [produtos])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return produtos.filter(p => {
      const passaBusca = !q || p.nome.toLowerCase().includes(q) || (p.categoria ?? '').toLowerCase().includes(q)
      const passaCategoria = !categoria || p.categoria === categoria
      const passaAtivo = filtroAtivo === 'todos'
        || (filtroAtivo === 'ativo'   &&  p.ativo)
        || (filtroAtivo === 'inativo' && !p.ativo)
      return passaBusca && passaCategoria && passaAtivo
    })
  }, [produtos, busca, categoria, filtroAtivo])

  const ativos       = produtos.filter(p =>  p.ativo).length
  const estoqueBaixo = estoqueBaixoIds.size
  const vencendo     = produtosComVencimento.size

  function fecharModal() { setModal({ open: false }) }
  function aoSalvar() { router.refresh() }

  const UNIDADE_ABREV: Record<string, string> = {
    kg: 'kg', litro: 'L', unidade: 'un', saco: 'sc', caixa: 'cx',
  }

  return (
    <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => router.push('/loja')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#888', padding: '0 0 4px', display: 'block' }}
          >
            ← Loja
          </button>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1a1a1a' }}>
            Produtos
          </h1>
        </div>
        <button
          onClick={() => setModal({ open: true, mode: 'create' })}
          style={{ padding: '9px 18px', background: VERDE, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          + Novo Produto
        </button>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        <CardStat label="Total de produtos" valor={produtos.length} />
        <CardStat label="Ativos"            valor={ativos}       cor={VERDE} />
        <CardStat label="Estoque baixo"     valor={estoqueBaixo} cor={estoqueBaixo > 0 ? '#dc2626' : '#888'} bg={estoqueBaixo > 0 ? '#fef2f2' : undefined} />
        <CardStat label="Vencendo (30 dias)" valor={vencendo}   cor={vencendo > 0 ? LARANJA : '#888'}        bg={vencendo > 0 ? '#fffbeb' : undefined} />
      </div>

      {/* Busca e filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nome ou categoria…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ ...inputStyle, flex: '1', minWidth: '200px' }}
        />
        <select value={categoria} onChange={e => setCategoria(e.target.value)} style={inputStyle}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value as typeof filtroAtivo)} style={inputStyle}>
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
            {busca || categoria || filtroAtivo !== 'todos'
              ? 'Nenhum produto encontrado com esses filtros.'
              : 'Nenhum produto cadastrado ainda.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Produto</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Categoria</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Preço normal</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Preço cooperado</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Estoque</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const eBaixo   = estoqueBaixoIds.has(p.id)
                const eVencendo = produtosComVencimento.has(p.id)
                return (
                  <tr
                    key={p.id}
                    onClick={() => setModal({ open: true, mode: 'view', produto: p })}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ borderBottom: '1px solid #f5f3ef', cursor: 'pointer', background: hovered === p.id ? '#fafaf8' : '#fff', transition: 'background 0.1s' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '3px' }}>
                        {p.nome}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {eBaixo && (
                          <span style={{ fontSize: '10px', fontWeight: '600', padding: '1px 7px', borderRadius: '20px', background: '#fef2f2', color: '#dc2626' }}>
                            estoque baixo
                          </span>
                        )}
                        {eVencendo && (
                          <span style={{ fontSize: '10px', fontWeight: '600', padding: '1px 7px', borderRadius: '20px', background: '#fffbeb', color: LARANJA }}>
                            vencimento próximo
                          </span>
                        )}
                        {p.loja_fornecedores && (
                          <span style={{ fontSize: '10px', color: '#aaa' }}>{p.loja_fornecedores.nome}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                      {p.categoria || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555', textAlign: 'right' }}>
                      {formatBRL(p.preco_normal)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: VERDE, fontWeight: '500', textAlign: 'right' }}>
                      {formatBRL(p.preco_cooperado)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: eBaixo ? '#dc2626' : '#1a1a1a' }}>
                        {p.estoque_atual.toLocaleString('pt-BR')}
                      </span>
                      <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '3px' }}>
                        {UNIDADE_ABREV[p.unidade] ?? p.unidade}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                        background: p.ativo ? '#dcfce7' : '#f5f3ef',
                        color: p.ativo ? '#166534' : '#888',
                      }}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: '12px', color: '#bbb', marginTop: '10px', textAlign: 'right' }}>
        {filtrados.length} de {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
      </p>

      {/* Modal */}
      {modal.open && modal.mode === 'create' && (
        <ProdutoModal
          mode="create"
          fornecedores={fornecedores}
          onClose={fecharModal}
          onSalvo={aoSalvar}
        />
      )}
      {modal.open && (modal.mode === 'view' || modal.mode === 'edit') && (
        <ProdutoModal
          mode={modal.mode}
          produto={modal.produto}
          fornecedores={fornecedores}
          onClose={fecharModal}
          onSalvo={aoSalvar}
        />
      )}
    </div>
  )
}
