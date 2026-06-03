'use client'

import { useState } from 'react'

const COR      = '#0F766E'
const COR_DARK = '#0c6659'
const COR_SUC  = '#166534'

const NIVEL_LABEL: Record<string, string> = {
  responsavel: 'Responsável',
  operador:    'Operador',
  consultor:   'Consultor',
}

export default function UsuarioPerfilClient({
  userId,
  email,
  profissional,
}: {
  userId: string
  email: string
  profissional: { id: string; nome: string; cargo: string | null; crc: string | null; nivel: string } | null
}) {
  const [nome,  setNome]  = useState(profissional?.nome  ?? '')
  const [cargo, setCargo] = useState(profissional?.cargo ?? '')
  const [crc,   setCrc]   = useState(profissional?.crc   ?? '')

  const [salvando, setSalvando] = useState(false)
  const [sucesso,  setSucesso]  = useState(false)
  const [erro,     setErro]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro(''); setSucesso(false)
    const res = await fetch('/api/aceitar-parceiro', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, nome: nome.trim(), cargo, crc }),
    })
    setSalvando(false)
    if (!res.ok) {
      const data = await res.json()
      setErro(data.error || 'Erro ao salvar.')
    } else {
      setSucesso(true)
      setTimeout(() => setSucesso(false), 2500)
    }
  }

  return (
    <div style={{ maxWidth: 820, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Meu Perfil</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {erro && <Alerta tipo="erro" style={{ marginBottom: '1rem' }}>{erro}</Alerta>}

        <SectionCard titulo="Dados pessoais">
          <Field label="Nome completo" required>
            <InpText value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
          </Field>
          <FormGrid cols="1fr 1fr">
            <Field label="Cargo">
              <InpText value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Contador, Auxiliar" />
            </Field>
            <Field label="CRC">
              <InpText value={crc} onChange={e => setCrc(e.target.value)} placeholder="Ex: CRC-BA 012345/O-1" />
            </Field>
          </FormGrid>
        </SectionCard>

        <SectionCard titulo="Acesso">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ReadField label="E-mail">{email}</ReadField>
            <ReadField label="Nível">{NIVEL_LABEL[profissional?.nivel ?? ''] ?? profissional?.nivel ?? '—'}</ReadField>
          </div>
        </SectionCard>

        <BtnPrimary type="submit" loading={salvando} success={sucesso}>
          {salvando ? 'Salvando...' : sucesso ? '✓ Salvo' : 'Salvar dados'}
        </BtnPrimary>
      </form>
    </div>
  )
}

// ── Helpers de UI (mesmo padrão de ConfiguracoesForm) ────────────────────────

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

function ReadField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1a1a1a' }}>{children}</div>
    </div>
  )
}

function InpText({ value, onChange, placeholder, type = 'text' }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={inp}
      onFocus={e => { e.target.style.borderColor = COR }}
      onBlur={e =>  { e.target.style.borderColor = '#d5d3cc' }}
    />
  )
}

function BtnPrimary({ children, type = 'button', loading, success }: {
  children: React.ReactNode
  type?: 'button' | 'submit'
  loading?: boolean
  success?: boolean
}) {
  const [hover, setHover] = useState(false)
  const bg = success ? COR_SUC : loading ? COR : hover ? COR_DARK : COR
  return (
    <button type={type} disabled={loading}
      style={{ padding: '10px 24px', background: bg, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'background 0.15s' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
