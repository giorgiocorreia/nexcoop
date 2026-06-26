'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listarCompradores, criarComprador, editarComprador } from '@/lib/comercializacao/compradores.actions'

const C = {
  cor: '#92400e', corLt: '#FDF8F4',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', sub: '#78716C',
}

type Comprador = {
  id: string; nome: string; tipo: 'exportador' | 'industria' | 'trader' | 'outro'
  cnpj: string | null; contato: string | null; email: string | null
  telefone: string | null; ie: string | null; logradouro: string | null
  numero: string | null; bairro: string | null; cep: string | null
  municipio: string | null; uf: string | null; ativo: boolean
}

const TIPO_LABEL: Record<string, string> = { exportador: 'Exportador', industria: 'Indústria', trader: 'Trader', outro: 'Outro' }
const TIPO_CORES: Record<string, { bg: string; color: string }> = {
  exportador: { bg: '#DBEAFE', color: '#1E40AF' },
  industria:  { bg: '#F3E8FF', color: '#6B21A8' },
  trader:     { bg: '#FEF3C7', color: '#92400E' },
  outro:      { bg: '#F1F0EB', color: '#78716C' }
}

const formVazio = {
  nome: '', tipo: 'industria' as 'exportador' | 'industria' | 'trader' | 'outro',
  cnpj: '', contato: '', email: '', telefone: '', ie: '',
  logradouro: '', numero: '', bairro: '', cep: '', municipio: '', uf: 'BA'
}

function mascaraCNPJ(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14)
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function mascaraCEP(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

function formatarCNPJ(cnpj: string | null): string {
  if (!cnpj) return '—'
  const d = cnpj.replace(/\D/g, '')
  return d.length !== 14 ? cnpj : mascaraCNPJ(d)
}

const inp: React.CSSProperties = { padding: '8px 12px', border: '1px solid #E5E3DC', borderRadius: 8, fontSize: 14 }

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState<Comprador[]>([])
  const [editando, setEditando] = useState<Comprador | null>(null)
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await listarCompradores()
    setCompradores((data ?? []) as unknown as Comprador[])
  }

  function abrirNovo() {
    setEditando(null); setForm(formVazio); setAbrirModal(true)
  }

  function abrirEdicao(c: Comprador) {
    setEditando(c)
    setForm({
      nome: c.nome, tipo: c.tipo,
      cnpj: c.cnpj ? mascaraCNPJ(c.cnpj) : '',
      contato: c.contato ?? '', email: c.email ?? '',
      telefone: c.telefone ? mascaraTelefone(c.telefone) : '',
      ie: c.ie ?? '', logradouro: c.logradouro ?? '', numero: c.numero ?? '',
      bairro: c.bairro ?? '', cep: c.cep ? mascaraCEP(c.cep) : '',
      municipio: c.municipio ?? '', uf: c.uf ?? 'BA'
    })
    setAbrirModal(true)
  }

  function fecharModal() { setAbrirModal(false); setEditando(null); setErroMsg(''); setStatus('idle') }

  async function handleSalvar() {
    if (!form.nome) return
    setStatus('salvando')
    try {
      const payload = {
        nome: form.nome, tipo: form.tipo,
        cnpj: form.cnpj ? form.cnpj.replace(/\D/g, '') : undefined,
        contato: form.contato || undefined, email: form.email || undefined,
        telefone: form.telefone ? form.telefone.replace(/\D/g, '') : undefined,
        ie: form.ie || undefined, logradouro: form.logradouro || undefined,
        numero: form.numero || undefined, bairro: form.bairro || undefined,
        cep: form.cep ? form.cep.replace(/\D/g, '') : undefined,
        municipio: form.municipio || undefined, uf: form.uf || undefined
      }
      if (editando) {
        await editarComprador(editando.id, { ...payload, ativo: editando.ativo })
      } else {
        await criarComprador(payload)
      }
      fecharModal(); await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) { setErroMsg(e.message); setStatus('erro') }
  }

  return (
    <>
      <style>{`
        .comp-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .comp-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .comp-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .comp-content { padding: 16px; }
        }
      `}</style>

      <header className="comp-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.corLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-building-store" style={{ fontSize: 20, color: C.cor }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
              Compradores
              {compradores.length > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: C.sub, marginLeft: 8 }}>{compradores.length}</span>}
            </h1>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.sub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}Compradores
            </div>
          </div>
        </div>
        <button onClick={abrirNovo}
          style={{ padding: '9px 18px', background: C.cor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Novo comprador
        </button>
      </header>

      <div className="comp-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

        {status === 'sucesso' && (
          <div style={{ marginBottom: 16, color: '#166534', fontSize: 13 }}>✓ Comprador salvo com sucesso.</div>
        )}

        <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borda}`, background: '#FAFAF8' }}>
                {['Nome', 'Tipo', 'CNPJ', 'Contato', 'Telefone', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: h === '' ? 'right' : 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.sub }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compradores.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid #F0EDE8` }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: C.txt }}>{c.nome}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 99, background: TIPO_CORES[c.tipo].bg, color: TIPO_CORES[c.tipo].color }}>
                      {TIPO_LABEL[c.tipo]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: C.sub }}>{formatarCNPJ(c.cnpj)}</td>
                  <td style={{ padding: '12px 16px', color: C.sub }}>{c.contato ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: C.sub }}>{c.telefone ? mascaraTelefone(c.telefone) : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 99, background: c.ativo ? '#DCFCE7' : '#F1F0EB', color: c.ativo ? '#166534' : C.sub }}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEdicao(c)} style={{ fontSize: 13, color: C.cor, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {compradores.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.sub }}>Nenhum comprador cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {abrirModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.txt }}>{editando ? 'Editar comprador' : 'Novo comprador'}</div>
              <button onClick={fecharModal} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.sub, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Nome *</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))} style={inp}>
                    <option value="exportador">Exportador</option>
                    <option value="industria">Indústria</option>
                    <option value="trader">Trader</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>CNPJ</label>
                <input value={form.cnpj} placeholder="00.000.000/0001-00" onChange={e => setForm(f => ({ ...f, cnpj: mascaraCNPJ(e.target.value) }))} style={inp} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Contato (nome)</label>
                  <input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <label style={{ fontSize: 12, color: C.sub }}>Telefone</label>
                  <input value={form.telefone} placeholder="(00) 00000-0000" onChange={e => setForm(f => ({ ...f, telefone: mascaraTelefone(e.target.value) }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: C.sub }}>E-mail</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
              </div>

              <div style={{ borderTop: `1px solid ${C.borda}`, paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endereço fiscal</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: C.sub }}>Inscrição Estadual (IE)</label>
                    <input value={form.ie} onChange={e => setForm(f => ({ ...f, ie: e.target.value }))} placeholder="Ex: 12345678" style={inp} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 3 }}>
                      <label style={{ fontSize: 12, color: C.sub }}>Logradouro</label>
                      <input value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} placeholder="Rua, Av, Rod..." style={inp} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <label style={{ fontSize: 12, color: C.sub }}>Número</label>
                      <input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="S/N" style={inp} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2 }}>
                      <label style={{ fontSize: 12, color: C.sub }}>Bairro</label>
                      <input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} style={inp} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <label style={{ fontSize: 12, color: C.sub }}>CEP</label>
                      <input value={form.cep} placeholder="00000-000" onChange={e => setForm(f => ({ ...f, cep: mascaraCEP(e.target.value) }))} style={inp} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 3 }}>
                      <label style={{ fontSize: 12, color: C.sub }}>Município</label>
                      <input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} style={inp} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <label style={{ fontSize: 12, color: C.sub }}>UF</label>
                      <input value={form.uf} maxLength={2} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} style={inp} />
                    </div>
                  </div>
                </div>
              </div>

              {editando && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input type="checkbox" checked={editando.ativo} onChange={e => setEditando(c => c && ({ ...c, ativo: e.target.checked }))} />
                  Ativo
                </label>
              )}
            </div>

            {status === 'erro' && <div style={{ marginTop: 12, color: '#991B1B', fontSize: 13 }}>{erroMsg}</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={fecharModal} style={{ padding: '8px 16px', border: `1px solid ${C.borda}`, borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={status === 'salvando'}
                style={{ padding: '8px 20px', background: C.cor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
