'use client'

import { useState } from 'react'
import { concluirOnboarding } from './actions'

const GREEN = '#635BFF'
const GREEN_DARK = '#4840CC'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '14px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

export default function OnboardingForm() {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState<{
    tipo: 'cooperativa' | 'associacao' | 'central'
    cnpj: string
    telefone: string
    cidade: string
    estado: string
  }>({
    tipo: 'cooperativa',
    cnpj: '',
    telefone: '',
    cidade: '',
    estado: '',
  })

  const set = (campo: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [campo]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cidade.trim() || !form.estado) {
      setErro('Cidade e estado são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')

    // Write org-level vai por server action (createAdminClient) — pela RLS do
    // browser o UPDATE voltava sempre com zero linhas. Ver app/onboarding/actions.ts.
    const resultado = await concluirOnboarding({
      tipo:     form.tipo,
      cnpj:     form.cnpj,
      telefone: form.telefone,
      cidade:   form.cidade,
      estado:   form.estado,
    })

    if (!resultado.ok) {
      setErro(resultado.erro)
      setSalvando(false)
      return
    }

    // Hard navigation: garante que o layout server-side leia onboarding_concluido=true
    // do banco sem nenhum cache RSC.
    window.location.href = '/dashboard'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f7f4',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/images/logo-nexcoop-horizontal.png" alt="NexCoop" style={{ height: 36, width: 'auto', display: 'block', margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
            Complete seu cadastro
          </h1>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '6px' }}>
            Precisamos de mais algumas informações sobre sua organização.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '16px', padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                  Tipo de organização <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { val: 'cooperativa', label: '🌾 Cooperativa' },
                    { val: 'associacao',  label: '🤝 Associação' },
                    { val: 'central',     label: '🏢 Central' },
                  ].map(op => (
                    <label key={op.val} style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 10px', border: `1px solid ${form.tipo === op.val ? GREEN : '#d5d3cc'}`,
                      borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                      background: form.tipo === op.val ? '#EEF0FF' : '#fafaf8',
                      color: form.tipo === op.val ? GREEN_DARK : '#555',
                      fontWeight: form.tipo === op.val ? '600' : '400',
                    }}>
                      <input type="radio" name="tipo" value={op.val}
                        checked={form.tipo === op.val} onChange={set('tipo')}
                        style={{ accentColor: GREEN }} />
                      {op.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>CNPJ</label>
                <input type="text" value={form.cnpj} onChange={set('cnpj')}
                  placeholder="00.000.000/0001-00" maxLength={18} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Telefone</label>
                <input type="tel" value={form.telefone} onChange={set('telefone')}
                  placeholder="(00) 00000-0000" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                    Cidade <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input type="text" value={form.cidade} onChange={set('cidade')}
                    placeholder="Sua cidade" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = GREEN}
                    onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                    UF <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select value={form.estado} onChange={set('estado')} required style={inputStyle}>
                    <option value="">UF</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>

              {erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#dc2626' }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={salvando}
                style={{ width: '100%', padding: '12px', background: salvando ? '#9F9BFF' : GREEN, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: salvando ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>
                {salvando ? 'Salvando...' : 'Concluir cadastro →'}
              </button>
            </div>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '1.5rem' }}>
          NexCoop © 2026
        </p>
      </div>
    </div>
  )
}
