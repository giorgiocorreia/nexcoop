'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { renomearCategoria } from '@/lib/loja/actions'
import { Btn } from '@/components/ui/Btn'
import { PageLayout, MODULO_LOJA, COM_C } from '@/components/nexcoop/ui'

interface Categoria {
  nome: string
  total: number
}

interface Props {
  categorias: Categoria[]
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '14px',
  border: `1px solid ${COM_C.borda}`, borderRadius: '8px', background: '#fff',
  color: COM_C.txt, outline: 'none', boxSizing: 'border-box',
}

export default function CategoriasClient({ categorias: inicial }: Props) {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [lista, setLista]   = useState<Categoria[]>(inicial)
  const [hovered, setHovered] = useState<string | null>(null)

  type ModalState =
    | { open: false }
    | { open: true; mode: 'nova' }
    | { open: true; mode: 'editar'; categoria: Categoria }

  const [modal, setModal]   = useState<ModalState>({ open: false })
  const [nome, setNome]     = useState('')
  const [erro, setErro]     = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (modal.open) {
      setNome(modal.mode === 'editar' ? modal.categoria.nome : '')
      setErro(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [modal])

  function fechar() { setModal({ open: false }) }

  async function handleSalvar() {
    if (!nome.trim()) { setErro('Informe o nome da categoria.'); return }
    setErro(null)

    if (!modal.open) return

    if (modal.mode === 'nova') {
      const jaExiste = lista.some(c => c.nome.toLowerCase() === nome.trim().toLowerCase())
      if (jaExiste) { setErro('Já existe uma categoria com esse nome.'); return }
      setLista(prev => [...prev, { nome: nome.trim(), total: 0 }].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
      fechar()
      return
    }

    if (modal.mode === 'editar') {
      const oldName = modal.categoria.nome
      if (nome.trim() === oldName) { fechar(); return }

      setSalvando(true)
      const result = await renomearCategoria(oldName, nome.trim())
      setSalvando(false)

      if (result.error) { setErro(result.error); return }

      setLista(prev =>
        prev.map(c => c.nome === oldName ? { ...c, nome: nome.trim() } : c)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      )
      fechar()
      router.refresh()
    }
  }

  return (
    <PageLayout
      titulo="Categorias"
      subtitulo={`${lista.length} categoria${lista.length !== 1 ? 's' : ''}`}
      icone="ti-tag"
      modulo={MODULO_LOJA}
      breadcrumb={[{ label: 'Produtos', href: '/loja/produtos' }, { label: 'Categorias' }]}
      acoes={
        <button
          onClick={() => setModal({ open: true, mode: 'nova' })}
          style={{
            padding: '9px 18px', background: COM_C.laranja, color: '#fff',
            borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 15 }} />
          Nova categoria
        </button>
      }
    >
        <div style={{ maxWidth: 720 }}>

          {/* Tabela */}
          <div style={{ background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: '12px', overflow: 'hidden' }}>
            {lista.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
                Nenhuma categoria cadastrada ainda.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COM_C.borda}`, background: '#fafaf9' }}>
                    <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: COM_C.txtSub, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Categoria
                    </th>
                    <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: COM_C.txtSub, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Produtos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(cat => (
                    <tr
                      key={cat.nome}
                      onClick={() => setModal({ open: true, mode: 'editar', categoria: cat })}
                      onMouseEnter={() => setHovered(cat.nome)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        borderBottom: '1px solid #f5f3ef', cursor: 'pointer',
                        background: hovered === cat.nome ? '#fafaf9' : '#fff',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: COM_C.txt, fontWeight: '500' }}>
                        {cat.nome}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '12px', fontWeight: '600',
                          color: cat.total === 0 ? '#aaa' : COM_C.txtSub,
                          background: cat.total === 0 ? '#f5f3ef' : '#f0f0f0',
                          padding: '2px 10px', borderRadius: '20px',
                        }}>
                          {cat.total} produto{cat.total !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      {/* Modal */}
      {modal.open && (
        <div
          onClick={fechar}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '14px', padding: '28px',
              width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: '700', color: COM_C.txt }}>
              {modal.mode === 'nova' ? 'Nova categoria' : 'Renomear categoria'}
            </h2>

            {modal.mode === 'nova' && (
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: COM_C.txtSub, lineHeight: '1.5' }}>
                Você pode usar esta categoria ao cadastrar ou editar produtos.
              </p>
            )}

            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: COM_C.txtSub, marginBottom: '6px' }}>
              Nome da categoria
            </label>
            <input
              ref={inputRef}
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSalvar() }}
              placeholder="Ex.: Nutrição animal"
              style={inputStyle}
            />

            {erro && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px' }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Btn variante="cinza" onClick={fechar}>Cancelar</Btn>
              <Btn onClick={handleSalvar} disabled={salvando} style={{ background: COM_C.laranja, color: '#fff', border: `1.5px solid ${COM_C.laranja}` }}>
                {salvando ? 'Salvando…' : modal.mode === 'nova' ? 'Criar' : 'Salvar'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
