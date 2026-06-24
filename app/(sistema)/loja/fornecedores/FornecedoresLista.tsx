'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { LojaFornecedor } from '@/types/database'
import FornecedorModal from '@/components/loja/FornecedorModal'
import { Btn } from '@/components/ui/Btn'

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  verde: '#1D9E75',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'view' | 'edit'; fornecedor: LojaFornecedor }

interface Props {
  fornecedores: LojaFornecedor[]
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', fontSize: '13px', border: `1px solid ${C.borda}`,
  borderRadius: '8px', background: '#fff', color: C.txt,
  outline: 'none', height: '36px', boxSizing: 'border-box',
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

  function fecharModal() { setModal({ open: false }) }
  function aoSalvar() { router.refresh() }

  return (
    <>
      <style>{`
        .forn-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .forn-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .forn-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .forn-content { padding: 16px; }
        }
      `}</style>

      <header className="forn-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-building-store" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
                Fornecedores
              </h1>
              <span style={{ background: '#f0eeea', color: C.txtSub, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                {ativos} ativo{ativos !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}Fornecedores
            </div>
          </div>
        </div>

        <button
          onClick={() => setModal({ open: true, mode: 'create' })}
          style={{
            padding: '9px 18px', background: C.laranja, color: '#fff',
            borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 15 }} />
          Novo fornecedor
        </button>
      </header>

      <div className="forn-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {/* Busca e filtros */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
          <span style={{ fontSize: 12, color: C.txtSub, whiteSpace: 'nowrap' }}>
            {filtrados.length} de {fornecedores.length}
          </span>
        </div>

        {/* Tabela */}
        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: '12px', overflow: 'hidden' }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
              {busca || filtro !== 'todos' ? 'Nenhum fornecedor encontrado com esses filtros.' : 'Nenhum fornecedor cadastrado ainda.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.borda}`, background: '#fafaf9' }}>
                    {['Nome', 'CNPJ', 'Telefone', 'E-mail', 'Status'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: C.txtSub, textAlign: i === 4 ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(f => (
                    <tr
                      key={f.id}
                      onClick={() => setModal({ open: true, mode: 'view', fornecedor: f })}
                      onMouseEnter={() => setHovered(f.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ borderBottom: '1px solid #f5f3ef', cursor: 'pointer', background: hovered === f.id ? '#fafaf9' : '#fff', transition: 'background 0.1s' }}
                    >
                      <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '600', color: C.txt }}>
                        {f.nome}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: C.txtSub }}>
                        {f.cnpj || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: C.txtSub }}>
                        {f.telefone || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: C.txtSub }}>
                        {f.email || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
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
            </div>
          )}
        </div>
      </div>

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
    </>
  )
}
