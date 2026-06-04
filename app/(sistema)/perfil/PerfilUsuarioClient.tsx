'use client'

import { useState } from 'react'
import type { Usuario } from '@/types/database'

const COR      = '#635BFF'
const COR_DARK = '#4840CC'
const COR_SUC  = '#166534'

export default function PerfilUsuarioClient({ usuario, email }: { usuario: Usuario | null; email: string }) {
  const [nome,     setNome]     = useState(usuario?.nome_completo ?? '')
  const [telefone, setTelefone] = useState(usuario?.telefone ?? '')
  const [salvando, setSalvando] = useState(false)
  const [sucesso,  setSucesso]  = useState(false)
  const [erro,     setErro]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro(''); setSucesso(false)
    const res = await fetch('/api/usuarios/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_completo: nome.trim(), telefone: telefone || null }),
    })
    setSalvando(false)
    if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro ao salvar.'); return }
    setSucesso(true)
    setTimeout(() => setSucesso(false), 2500)
  }

  return (
    <div style={{ maxWidth: 820, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Meu Perfil</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {erro && <Alerta tipo="erro" style={{ marginBottom: '1rem' }}>{erro}</Alerta>}

        <SectionCard titulo="Dados pessoais">
          {/* Foto — placeholder futuro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: COR,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {nome.trim().charAt(0).toUpperCase() || '?'}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
              Foto de perfil — em breve
            </div>
          </div>

          <FormGrid cols="1fr 1fr">
            <Field label="Nome completo" required>
              <InpText value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" cor={COR} />
            </Field>
            <Field label="Telefone">
              <InpText value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" type="tel" cor={COR} />
            </Field>
          </FormGrid>

          <Field label="E-mail">
            <div style={{ ...inp, background: '#f0eeea', color: '#888', cursor: 'default' }}>{email}</div>
          </Field>
        </SectionCard>

        <BtnPrimary type="submit" loading={salvando} success={sucesso} cor={COR} corDark={COR_DARK} corSuc={COR_SUC}>
          {salvando ? 'Salvando...' : sucesso ? '✓ Salvo' : 'Salvar dados'}
        </BtnPrimary>
      </form>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: '1rem' }}>{titulo}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
    </div>
  )
}

function FormGrid({ cols, children }: { cols: string; children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12 }}>{children}</div>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function InpText({ value, onChange, placeholder, type = 'text', cor }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; type?: string; cor: string
}) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={inp}
      onFocus={e => { e.target.style.borderColor = cor }}
      onBlur={e =>  { e.target.style.borderColor = '#d5d3cc' }}
    />
  )
}

function BtnPrimary({ children, type = 'button', loading, success, cor, corDark, corSuc }: {
  children: React.ReactNode; type?: 'button' | 'submit'
  loading?: boolean; success?: boolean; cor: string; corDark: string; corSuc: string
}) {
  const [hover, setHover] = useState(false)
  const bg = success ? corSuc : loading ? cor : hover ? corDark : cor
  return (
    <button type={type} disabled={loading}
      style={{ padding: '10px 24px', background: bg, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'background 0.15s' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  )
}

function Alerta({ tipo, children, style }: { tipo: 'erro' | 'ok'; children: React.ReactNode; style?: React.CSSProperties }) {
  const ok = tipo === 'ok'
  return (
    <div style={{ background: ok ? '#E6F7F1' : '#fef2f2', border: `1px solid ${ok ? '#1D9E7533' : '#fca5a5'}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: ok ? '#166534' : '#dc2626', ...style }}>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: 8, fontSize: 13, background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
