'use client'

import { useState } from 'react'
import Link from 'next/link'
import { criarUnidade, toggleUnidade, atualizarUnidade } from '@/lib/loja/unidades-actions'
import { Btn } from '@/components/ui/Btn'

interface Unidade {
  id: string; nome: string; sigla: string; ativo: boolean
}

const inp: React.CSSProperties = {
  padding: '8px 12px', fontSize: 13, border: '1px solid #d5d3cc',
  borderRadius: 8, background: '#fff', outline: 'none',
  boxSizing: 'border-box' as const, width: '100%',
}

const inpSm: React.CSSProperties = {
  padding: '5px 8px', fontSize: 12, border: '1px solid #d5d3cc',
  borderRadius: 6, background: '#fff', outline: 'none',
  boxSizing: 'border-box' as const,
}

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

export default function UnidadesClient({ orgId, unidades: inicial }: { orgId: string; unidades: Unidade[] }) {
  const [unidades, setUnidades] = useState(inicial)
  const [nome, setNome]         = useState('')
  const [sigla, setSigla]       = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  const [editandoId, setEditandoId]   = useState<string | null>(null)
  const [editNome, setEditNome]       = useState('')
  const [editSigla, setEditSigla]     = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroEdit, setErroEdit]       = useState('')

  async function handleCriar() {
    if (!nome.trim()) { setErro('Informe o nome.'); return }
    if (!sigla.trim()) { setErro('Informe a sigla.'); return }
    setSalvando(true); setErro('')
    const res = await criarUnidade(orgId, { nome, sigla })
    setSalvando(false)
    if ('error' in res) { setErro(res.error ?? ''); return }
    setUnidades(prev => [...prev, res.data as Unidade].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNome(''); setSigla('')
  }

  async function handleToggle(id: string, ativo: boolean) {
    await toggleUnidade(id, !ativo)
    setUnidades(prev => prev.map(u => u.id === id ? { ...u, ativo: !ativo } : u))
  }

  function iniciarEdit(u: Unidade) {
    setEditandoId(u.id)
    setEditNome(u.nome)
    setEditSigla(u.sigla)
    setErroEdit('')
  }

  function cancelarEdit() {
    setEditandoId(null)
    setErroEdit('')
  }

  async function handleSalvarEdit(id: string) {
    if (!editNome.trim()) { setErroEdit('Nome obrigatório.'); return }
    if (!editSigla.trim()) { setErroEdit('Sigla obrigatória.'); return }
    setSalvandoEdit(true); setErroEdit('')
    const res = await atualizarUnidade(id, { nome: editNome, sigla: editSigla })
    setSalvandoEdit(false)
    if (res && 'error' in res) { setErroEdit(res.error ?? ''); return }
    setUnidades(prev => prev.map(u => u.id === id ? { ...u, nome: editNome.trim(), sigla: editSigla.trim() } : u))
    setEditandoId(null)
  }

  const ativas   = unidades.filter(u => u.ativo)
  const inativas = unidades.filter(u => !u.ativo)

  return (
    <>
      <style>{`
        .un-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .un-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .un-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .un-content { padding: 16px; }
        }
      `}</style>

      <header className="un-header" style={{
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
            <i className="ti ti-ruler-2" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
              Unidades de Medida
            </h1>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}Unidades
            </div>
          </div>
        </div>
      </header>

      <div className="un-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>
        <div style={{ maxWidth: 700 }}>

          {/* Formulário novo */}
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 14 }}>Nova unidade</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.txtSub, display: 'block', marginBottom: 4 }}>Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: fardo" style={inp}
                  onKeyDown={e => e.key === 'Enter' && handleCriar()} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.txtSub, display: 'block', marginBottom: 4 }}>Sigla *</label>
                <input value={sigla} onChange={e => setSigla(e.target.value)} placeholder="Ex: fd" style={inp}
                  onKeyDown={e => e.key === 'Enter' && handleCriar()} />
              </div>
              <Btn onClick={handleCriar} disabled={salvando}
                style={{ background: C.laranja, color: '#fff', border: `1.5px solid ${C.laranja}` }}>
                {salvando ? '...' : '+ Adicionar'}
              </Btn>
            </div>
            {erro && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{erro}</div>}
          </div>

          {/* Lista ativas */}
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0eeea', fontSize: 12, fontWeight: 600, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ativas ({ativas.length})
            </div>
            {ativas.map((u, i) => (
              <div key={u.id} style={{ borderBottom: i < ativas.length - 1 ? '1px solid #f5f5f4' : 'none' }}>
                {editandoId === u.id ? (
                  <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input value={editNome} onChange={e => setEditNome(e.target.value)} style={{ ...inpSm, width: 160 }} placeholder="Nome" />
                    <input value={editSigla} onChange={e => setEditSigla(e.target.value)} style={{ ...inpSm, width: 80 }} placeholder="Sigla" />
                    <button onClick={() => handleSalvarEdit(u.id)} disabled={salvandoEdit}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: C.laranja, color: '#fff', border: 'none' }}>
                      {salvandoEdit ? '...' : 'Salvar'}
                    </button>
                    <button onClick={cancelarEdit}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: C.txtSub, border: `1px solid ${C.borda}` }}>
                      Cancelar
                    </button>
                    {erroEdit && <span style={{ fontSize: 12, color: '#dc2626' }}>{erroEdit}</span>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{u.nome}</span>
                      <span style={{ fontSize: 11, background: '#f0eeea', color: C.txtSub, padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace' }}>{u.sigla}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn tamanho="sm" variante="cinza" onClick={() => iniciarEdit(u)}>Editar</Btn>
                      <Btn tamanho="sm" variante="cinza" onClick={() => handleToggle(u.id, u.ativo)}
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
                        Desativar
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {ativas.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Nenhuma unidade ativa.</div>
            )}
          </div>

          {/* Lista inativas */}
          {inativas.length > 0 && (
            <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0eeea', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Inativas ({inativas.length})
              </div>
              {inativas.map((u, i) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderBottom: i < inativas.length - 1 ? '1px solid #f5f5f4' : 'none', opacity: 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13 }}>{u.nome}</span>
                    <span style={{ fontSize: 11, background: '#f0eeea', color: C.txtSub, padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace' }}>{u.sigla}</span>
                  </div>
                  <Btn tamanho="sm" variante="cinza" onClick={() => handleToggle(u.id, u.ativo)}>
                    Reativar
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
