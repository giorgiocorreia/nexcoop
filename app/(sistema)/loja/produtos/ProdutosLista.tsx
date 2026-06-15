'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { LojaFornecedor } from '@/types/database'
import type { LojaProdutoComFornecedor } from '@/lib/loja/actions'
import { Btn } from '@/components/ui/Btn'

const VERDE   = '#1D9E75'
const LARANJA = '#d97706'

interface Props {
  produtos:              LojaProdutoComFornecedor[]
  fornecedores:          Pick<LojaFornecedor, 'id' | 'nome'>[]
  produtosComVencimento: Set<string>
  podeGerenciar:         boolean
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

const UNIDADE_ABREV: Record<string, string> = {
  kg: 'kg', litro: 'L', unidade: 'un', saco: 'sc', caixa: 'cx',
}

export default function ProdutosLista({ produtos, fornecedores, produtosComVencimento, podeGerenciar }: Props) {
  const router = useRouter()
  const [busca, setBusca]           = useState('')
  const [filtroForn, setFiltroForn] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [hovered, setHovered]       = useState<string | null>(null)

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
      const passaBusca    = !q || p.nome.toLowerCase().includes(q) || (p.categoria ?? '').toLowerCase().includes(q)
      const passaForn     = !filtroForn || p.fornecedor_id === filtroForn
      const passaAtivo    = filtroAtivo === 'todos'
        || (filtroAtivo === 'ativo'   &&  p.ativo)
        || (filtroAtivo === 'inativo' && !p.ativo)
      return passaBusca && passaForn && passaAtivo
    })
  }, [produtos, busca, filtroForn, filtroAtivo])

  const ativos       = produtos.filter(p =>  p.ativo).length
  const estoqueBaixo = estoqueBaixoIds.size
  const vencendo     = produtosComVencimento.size

  return (
    <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
            <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>NexCoop</Link>
            <span style={{ color: '#d1d5db' }}>/</span>
            <Link href="/loja" style={{ color: '#6b7280', textDecoration: 'none' }}>Loja</Link>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#1a1a1a' }}>Produtos</span>
          </div>
        </div>
        {podeGerenciar && (
          <Link
            href="/loja/produtos/novo"
            style={{
              padding: '9px 18px', background: '#E07B30', color: '#fff',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            + Novo produto
          </Link>
        )}
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        <CardStat label="Total de produtos" valor={produtos.length} />
        <CardStat label="Ativos"             valor={ativos}       cor={VERDE} />
        <CardStat label="Estoque baixo"      valor={estoqueBaixo} cor={estoqueBaixo > 0 ? '#dc2626' : '#888'} bg={estoqueBaixo > 0 ? '#fef2f2' : undefined} />
        <CardStat label="Vencendo (30 dias)" valor={vencendo}     cor={vencendo > 0 ? LARANJA : '#888'}       bg={vencendo > 0 ? '#fffbeb' : undefined} />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nome ou categoria…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ ...inputStyle, flex: '1', minWidth: '200px' }}
        />
        <select value={filtroForn} onChange={e => setFiltroForn(e.target.value)} style={inputStyle}>
          <option value="">Todos os fornecedores</option>
          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
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
            {busca || filtroForn || filtroAtivo !== 'todos'
              ? 'Nenhum produto encontrado com esses filtros.'
              : 'Nenhum produto cadastrado ainda.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                {['Produto', 'Unidade', 'Preço de venda', 'Desc. cooperado', 'Saldo', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: h === 'Produto' ? 'left' : 'center' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const eBaixo    = estoqueBaixoIds.has(p.id)
                const eVencendo = produtosComVencimento.has(p.id)
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/loja/produtos/${p.id}`)}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      borderBottom: '1px solid #f5f3ef', cursor: 'pointer',
                      background: hovered === p.id ? '#fafaf8' : '#fff',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Nome */}
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
                    {/* Unidade */}
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555', textAlign: 'center' }}>
                      {UNIDADE_ABREV[p.unidade] ?? p.unidade}
                    </td>
                    {/* Preço */}
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555', textAlign: 'center' }}>
                      {formatBRL(p.preco_normal)}
                    </td>
                    {/* Desconto cooperado */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {p.desconto_cooperado ? (
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#fff4ec', color: '#E07B30' }}>
                          {p.desconto_cooperado_pct != null ? `${p.desconto_cooperado_pct}%` : 'Sim'}
                        </span>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                    {/* Saldo */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: eBaixo ? '#dc2626' : '#1a1a1a' }}>
                        {p.estoque_atual.toLocaleString('pt-BR')}
                      </span>
                      <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '3px' }}>
                        {UNIDADE_ABREV[p.unidade] ?? p.unidade}
                      </span>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                        background: p.ativo ? '#dcfce7' : '#f5f3ef',
                        color:      p.ativo ? '#166534' : '#888',
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

    </div>
  )
}
