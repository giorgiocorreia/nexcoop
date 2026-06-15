'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { renomearCategoria } from '@/lib/loja/actions'
import { Btn } from '@/components/ui/Btn'

interface Categoria {
  nome: string
  total: number
}

interface Props {
  categorias: Categoria[]
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '14px',
  border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
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
    <div style={{ maxWidth: '720px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#9ca3af',marginBottom:8}}><i className="ti ti-shopping-bag" style={{fontSize:14}}/> Loja Agropecuária</div>
          <Btn variante="cinza" tamanho="sm" onClick={() => router.push('/loja/produtos')}>← Produtos</Btn>
        </div>
        <Btn onClick={() => setModal({ open: true, mode: 'nova' })} style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}>
          + Nova categoria
        </Btn>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        {lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
            Nenhuma categoria cadastrada ainda.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e3dc', background: '#fafaf8' }}>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Categoria
                </th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#888', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
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
                    background: hovered === cat.nome ? '#fafaf8' : '#fff',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1a1a1a', fontWeight: '500' }}>
                    {cat.nome}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: '600',
                      color: cat.total === 0 ? '#aaa' : '#555',
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

      <p style={{ fontSize: '12px', color: '#bbb', marginTop: '10px', textAlign: 'right' }}>
        {lista.length} categoria{lista.length !== 1 ? 's' : ''}
      </p>

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
            <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: '700', color: '#1a1a1a' }}>
              {modal.mode === 'nova' ? 'Nova categoria' : 'Renomear categoria'}
            </h2>

            {modal.mode === 'nova' && (
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#888', lineHeight: '1.5' }}>
                Você pode usar esta categoria ao cadastrar ou editar produtos.
              </p>
            )}

            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
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
              <Btn onClick={handleSalvar} disabled={salvando} style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}>
                {salvando ? 'Salvando…' : modal.mode === 'nova' ? 'Criar' : 'Salvar'}
              </Btn>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
