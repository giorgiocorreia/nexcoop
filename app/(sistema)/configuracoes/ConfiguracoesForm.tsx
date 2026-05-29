'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Organizacao } from '@/types/database'

const GREEN = '#635BFF'
const GREEN_DARK = '#4840CC'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

const disabledStyle: React.CSSProperties = {
  ...inputStyle,
  background: '#f0eeea', color: '#888', cursor: 'not-allowed',
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
      {children}{required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

interface Props {
  org: Organizacao
  isSuperAdmin: boolean
}

export default function ConfiguracoesForm({ org: orgInicial, isSuperAdmin }: Props) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [form, setForm] = useState({
    nome: orgInicial.nome,
    nome_curto: orgInicial.nome_curto || '',
    tipo: orgInicial.tipo,
    cnpj: orgInicial.cnpj || '',
    email: orgInicial.email || '',
    telefone: orgInicial.telefone || '',
    site: orgInicial.site || '',
    cep: orgInicial.cep || '',
    logradouro: orgInicial.logradouro || '',
    numero: orgInicial.numero || '',
    complemento: orgInicial.complemento || '',
    bairro: orgInicial.bairro || '',
    cidade: orgInicial.cidade || '',
    estado: orgInicial.estado || '',
    data_fundacao: orgInicial.data_fundacao || '',
    registro_juceb: orgInicial.registro_juceb || '',
  })

  const set = (campo: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [campo]: e.target.value }))

  async function buscarCEP(cep: string) {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }))
      }
    } catch { /* silencia */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSucesso('')

    const supabase = createClient()

    const payload: Record<string, unknown> = {
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      site: form.site.trim() || undefined,
      cep: form.cep.replace(/\D/g, '') || undefined,
      logradouro: form.logradouro.trim() || undefined,
      numero: form.numero.trim() || undefined,
      complemento: form.complemento.trim() || undefined,
      bairro: form.bairro.trim() || undefined,
      cidade: form.cidade.trim() || undefined,
      estado: form.estado || undefined,
    }

    if (isSuperAdmin) {
      payload.nome = form.nome.trim()
      payload.nome_curto = form.nome_curto.trim() || undefined
      payload.tipo = form.tipo
      payload.cnpj = form.cnpj.replace(/\D/g, '') || undefined
      payload.data_fundacao = form.data_fundacao || undefined
      payload.registro_juceb = form.registro_juceb.trim() || undefined
    }

    const { error } = await supabase
      .from('organizacoes')
      .update(payload as any)
      .eq('id', orgInicial.id)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
    } else {
      setSucesso('Dados salvos com sucesso.')
      router.refresh()
    }
    setSalvando(false)
  }

  return (
    <div style={{ maxWidth: '760px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Configurações</h1>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Dados cadastrais da organização</p>
      </div>

      {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>{erro}</div>}
      {sucesso && <div style={{ background: '#EEF0FF', border: '1px solid #635BFF33', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: GREEN_DARK, marginBottom: '1rem' }}>✓ {sucesso}</div>}

      <form onSubmit={handleSubmit}>
        {/* Identificação */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>Identificação</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '12px' }}>
              <div>
                <Label required>Nome completo</Label>
                <input type="text" value={form.nome} onChange={set('nome')}
                  disabled={!isSuperAdmin}
                  style={isSuperAdmin ? inputStyle : disabledStyle}
                  onFocus={e => { if (isSuperAdmin) e.target.style.borderColor = GREEN }}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
              <div>
                <Label>Sigla / Nome curto</Label>
                <input type="text" value={form.nome_curto} onChange={set('nome_curto')}
                  disabled={!isSuperAdmin}
                  placeholder="Ex: COOPAIBI"
                  style={isSuperAdmin ? inputStyle : disabledStyle}
                  onFocus={e => { if (isSuperAdmin) e.target.style.borderColor = GREEN }}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <Label>Tipo</Label>
                <select value={form.tipo} onChange={set('tipo')}
                  disabled={!isSuperAdmin}
                  style={isSuperAdmin ? inputStyle : disabledStyle}>
                  <option value="cooperativa">Cooperativa</option>
                  <option value="associacao">Associação</option>
                  <option value="central">Central</option>
                </select>
              </div>
              <div>
                <Label>CNPJ</Label>
                <input type="text" value={form.cnpj} onChange={set('cnpj')}
                  disabled={!isSuperAdmin}
                  placeholder="00.000.000/0001-00"
                  style={isSuperAdmin ? inputStyle : disabledStyle}
                  onFocus={e => { if (isSuperAdmin) e.target.style.borderColor = GREEN }}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <Label>E-mail</Label>
                <input type="email" value={form.email} onChange={set('email')}
                  placeholder="contato@org.com.br" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <input type="tel" value={form.telefone} onChange={set('telefone')}
                  placeholder="(00) 00000-0000" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
              <div>
                <Label>Site</Label>
                <input type="text" value={form.site} onChange={set('site')}
                  placeholder="https://..." style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
            </div>

            {isSuperAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label>Data de fundação</Label>
                  <input type="date" value={form.data_fundacao} onChange={set('data_fundacao')}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = GREEN}
                    onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                  />
                </div>
                <div>
                  <Label>Registro JUCEB / Cartório</Label>
                  <input type="text" value={form.registro_juceb} onChange={set('registro_juceb')}
                    placeholder="Número do registro" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = GREEN}
                    onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Endereço */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>Endereço</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
              <div>
                <Label>CEP</Label>
                <input type="text" value={form.cep} onChange={e => {
                  set('cep')(e)
                  if (e.target.value.replace(/\D/g, '').length === 8) buscarCEP(e.target.value)
                }} placeholder="00000-000" maxLength={9} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => { e.target.style.borderColor = '#d5d3cc'; buscarCEP(form.cep) }}
                />
              </div>
              <div>
                <Label>Logradouro</Label>
                <input type="text" value={form.logradouro} onChange={set('logradouro')}
                  placeholder="Rua, Avenida…" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '12px' }}>
              <div>
                <Label>Número</Label>
                <input type="text" value={form.numero} onChange={set('numero')}
                  placeholder="123" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
              <div>
                <Label>Complemento</Label>
                <input type="text" value={form.complemento} onChange={set('complemento')}
                  placeholder="Sala, Apto…" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
              <div>
                <Label>Bairro</Label>
                <input type="text" value={form.bairro} onChange={set('bairro')}
                  placeholder="Bairro" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px' }}>
              <div>
                <Label>Cidade</Label>
                <input type="text" value={form.cidade} onChange={set('cidade')}
                  placeholder="Cidade" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = GREEN}
                  onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                />
              </div>
              <div>
                <Label>UF</Label>
                <select value={form.estado} onChange={set('estado')} style={inputStyle}>
                  <option value="">UF</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={salvando} style={{
          padding: '10px 24px', background: salvando ? '#9F9BFF' : GREEN,
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '14px', fontWeight: '600',
          cursor: salvando ? 'not-allowed' : 'pointer',
        }}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}