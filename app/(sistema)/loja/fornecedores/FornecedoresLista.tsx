'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { LojaFornecedor } from '@/types/database'
import FornecedorModal from '@/components/loja/FornecedorModal'
import { Btn } from '@/components/ui/Btn'

const VERDE = '#1D9E75'

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'view' | 'edit'; fornecedor: LojaFornecedor }

interface Props {
  fornecedores: LojaFornecedor[]
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', fontSize: '13px', border: '1px solid #d5d3cc',
  borderRadius: '8px', background: '#fff', color: '#1a1a1a',
  outline: 'none', height: '36px', boxSizing: 'border-box',
}

function CardStat({ label, valor, cor }: { label: string; valor: number; cor?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '14px 18px' }}>
      <div style={{ fontSize: '22px', fontWeight: '700', color: cor ?? '#1a1a1a' }}>{valor}</div>
      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

export default function FornecedoresLista({ fornecedores }: Props) {
  const router = useRouter()
  const [busca, setBusca]     = useState('')
  const [filtro, setFiltro]   = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [hovered, setHovered] = useState<string | null>(null)
  const [modal, setModal]     = useState<ModalState>({ open: false })

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return fornecedores.filter(f => {
      const passaBusca = !q
        || f.nome.toLowerCase().includes(q)
        || (f.cnpj ?? '').includes(q)
        || (f.email ?? '').toLowerCase().includes(q)
      const passaFiltro = filtro === 'todos'
        || (filtro === 'ativo'   &&  f.ativo)
        || (filtro === 'inativo' && !f.ativo)
      return passaBusca && passaFiltro
    })
  }, [fornecedores, busca, filtro])

  const ativos   = fornecedores.filter(f =>  f.ativo).length
  const inativos = fornecedores.filter(f => !f.ativo).length

  function abrirCriar() {
    setModal({ open: true, mode: 'create' })
  }

  function abrirVer(f: LojaFornecedor) {
    setModal({ open: true, mode: 'view', fornecedor: f })
  }

  function fecharModal() {
    setModal({ open: false })
  }

  function aoSalvar() {
    router.refresh()
  }

  return (
    <div style={{ maxWidth: '1000px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
            <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>NexCoop</Link>
            <span style={{ color: '#d1d5db' }}>/</span>
            <Link href="/loja" style={{ color: '#6b7280', textDecoration: 'none' }}>Loja</Link>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#1a1a1a' }}>Fornecedores</span>
          </div>
        </div>
        <Btn onClick={abrirCriar} style={{ background: VERDE, color: '#fff', border: `1.5px solid ${VERDE}` }}>
          + Novo Fornecedor
        </Btn>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        <CardStat label="Total"    valor={fornecedores.length} />
        <CardStat label="Ativos"   valor={ativos}   cor={VERDE} />
        <CardStat label="Inativos" valor={inativos}  cor="#888" />
      </div>

      {/* Busca e filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ ou e-mail…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ ...inputStyle, flex: '1', minWidth: '200px' }}
        />
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value as typeof filtro)}
          style={inputStyle}
        >
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
            {busca || filtro !== 'todos' ? 'Nenhum fornecedor encontrado com esses filtros.' : 'Nenhum fornecedor cadastrado ainda.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Nome</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>CNPJ</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Telefone</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>E-mail</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(f => (
                <tr
                  key={f.id}
                  onClick={() => abrirVer(f)}
                  onMouseEnter={() => setHovered(f.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ borderBottom: '1px solid #f5f3ef', cursor: 'pointer', background: hovered === f.id ? '#fafaf8' : '#fff', transition: 'background 0.1s' }}
                >
                  <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                    {f.nome}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: '13px', color: '#555' }}>
                    {f.cnpj || '—'}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: '13px', color: '#555' }}>
                    {f.telefone || '—'}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: '13px', color: '#555' }}>
                    {f.email || '—'}
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                      background: f.ativo ? '#dcfce7' : '#f5f3ef',
                      color: f.ativo ? '#166534' : '#888',
                    }}>
                      {f.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: '12px', color: '#bbb', marginTop: '10px', textAlign: 'right' }}>
        {filtrados.length} de {fornecedores.length} fornecedor{fornecedores.length !== 1 ? 'es' : ''}
      </p>

      {/* Modal */}
      {modal.open && modal.mode === 'create' && (
        <FornecedorModal mode="create" onClose={fecharModal} onSalvo={aoSalvar} />
      )}
      {modal.open && (modal.mode === 'view' || modal.mode === 'edit') && (
        <FornecedorModal
          mode={modal.mode}
          fornecedor={modal.fornecedor}
          onClose={fecharModal}
          onSalvo={aoSalvar}
        />
      )}
    </div>
  )
}
