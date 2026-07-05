'use client'

import { useState } from 'react'
import { PageLayout, MODULO_ESCRITORIO, COM_C } from '@/components/nexcoop/ui'

const COR_DARK = '#15803d'
const COR_SUC  = '#166534'

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function EmpresaPerfilClient({ empresa }: { empresa: any }) {
  const [form, setForm] = useState({
    razao_social:  empresa.razao_social  ?? '',
    cnpj:          empresa.cnpj          ?? '',
    email_contato: empresa.email_contato ?? '',
    telefone:      empresa.telefone      ?? '',
    cidade:        empresa.cidade        ?? '',
    estado:        empresa.estado        ?? '',
    site:          empresa.site          ?? '',
  })
  const [salvando, setSalvando] = useState(false)
  const [sucesso,  setSucesso]  = useState(false)
  const [erro,     setErro]     = useState('')

  const set = (campo: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [campo]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setErro(''); setSucesso(false)
    const res = await fetch('/api/parceiros/empresa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId: empresa.id, ...form }),
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
    <PageLayout
      titulo="Dados da Empresa"
      icone="ti-building"
      modulo={MODULO_ESCRITORIO}
      breadcrumb={[{ label: 'Dados da Empresa' }]}
    >
    <div style={{ maxWidth: 820, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <form onSubmit={handleSubmit}>
        {erro && <Alerta tipo="erro" style={{ marginBottom: '1rem' }}>{erro}</Alerta>}

        <SectionCard titulo="Identificação">
          <Field label="Razão Social" required>
            <InpText value={form.razao_social} onChange={set('razao_social')} placeholder="Nome completo da empresa" />
          </Field>
          <FormGrid cols="1fr 1fr">
            <Field label="CNPJ">
              <InpText value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" />
            </Field>
            <Field label="Site">
              <InpText value={form.site} onChange={set('site')} placeholder="https://..." />
            </Field>
          </FormGrid>
          <FormGrid cols="1fr 1fr">
            <Field label="E-mail de contato">
              <InpText type="email" value={form.email_contato} onChange={set('email_contato')} placeholder="contato@empresa.com.br" />
            </Field>
            <Field label="Telefone">
              <InpText type="tel" value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
            </Field>
          </FormGrid>
        </SectionCard>

        <SectionCard titulo="Localização">
          <FormGrid cols="1fr 80px">
            <Field label="Cidade">
              <InpText value={form.cidade} onChange={set('cidade')} placeholder="Cidade" />
            </Field>
            <Field label="UF">
              <select value={form.estado} onChange={set('estado')} style={inp}>
                <option value="">UF</option>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </Field>
          </FormGrid>
        </SectionCard>

        <BtnPrimary type="submit" loading={salvando} success={sucesso}>
          {salvando ? 'Salvando...' : sucesso ? '✓ Salvo' : 'Salvar alterações'}
        </BtnPrimary>
      </form>
    </div>
    </PageLayout>
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
      onFocus={e => { e.target.style.borderColor = COM_C.verde }}
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
  const bg = success ? COR_SUC : loading ? COM_C.verde : hover ? COR_DARK : COM_C.verde
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
