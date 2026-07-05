'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { LojaFornecedor } from '@/types/database'
import FornecedorModal from '@/components/loja/FornecedorModal'
import { Btn } from '@/components/ui/Btn'
import { PageLayout, MODULO_LOJA, COM_C } from '@/components/nexcoop/ui'

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'view' | 'edit'; fornecedor: LojaFornecedor }

interface Props {
  fornecedores: LojaFornecedor[]
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', fontSize: '13px', border: `1px solid ${COM_C.borda}`,
  borderRadius: '8px', background: '#fff', color: COM_C.txt,
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
    <PageLayout
      titulo="Fornecedores"
      icone="ti-building-store"
      modulo={MODULO_LOJA}
      acoes={
        <>
          <button
          onClick={() => setModal({ open: true, mode: 'create' })}
          style={{
            padding: '9px 18px', background: COM_C.laranja, color: '#fff',
            borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 15 }} />
          Novo fornecedor
        </button>
        </>
      }
    >
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
          <span style={{ fontSize: 12, color: COM_C.txtSub, whiteSpace: 'nowrap' }}>
            {filtrados.length} de {fornecedores.length}
          </span>
        </div>

        {/* Tabela */}
        <div style={{ background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: '12px', overflow: 'hidden' }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
              {busca || filtro !== 'todos' ? 'Nenhum fornecedor encontrado com esses filtros.' : 'Nenhum fornecedor cadastrado ainda.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COM_C.borda}`, background: '#fafaf9' }}>
                    {['Nome', 'CNPJ', 'Telefone', 'E-mail', 'Status'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: COM_C.txtSub, textAlign: i === 4 ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
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
                      <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '600', color: COM_C.txt }}>
                        {f.nome}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: COM_C.txtSub }}>
                        {f.cnpj || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: COM_C.txtSub }}>
                        {f.telefone || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: COM_C.txtSub }}>
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
    </PageLayout>
  )
}
