'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Organizacao, PerfilCaptacao, Usuario } from '@/types/database'
import { salvarOrganizacao } from './actions'
import { salvarPerfilCaptacao } from '@/lib/captacao/actions'
import PerfilUsuario from './PerfilUsuario'

const GREEN = '#635BFF'
const GREEN_DARK = '#4840CC'
const TEAL = '#1D9E75'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const AREAS_CAPTACAO = [
  'agrofloresta', 'cacau', 'café', 'pecuária', 'pesca', 'mel',
  'plantas medicinais', 'clima', 'cooperativismo',
  'agricultura familiar', 'biodiversidade', 'turismo rural',
  'artesanato', 'aquicultura', 'apicultura', 'outro',
]

const PUBLICOS_ALVO = [
  'agricultores familiares', 'mulheres rurais', 'jovens rurais',
  'quilombolas', 'indígenas', 'assentados', 'pescadores artesanais',
  'extrativistas', 'outro',
]

const ABRANGENCIAS = ['municipal', 'microrregional', 'estadual', 'nacional', 'internacional']

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
  org: Organizacao | null
  isSuperAdmin: boolean
  perfilCaptacao: PerfilCaptacao | null
  usuario: Usuario
}

export default function ConfiguracoesForm({ org: orgInicial, isSuperAdmin, perfilCaptacao, usuario }: Props) {
  const isOrgAdmin     = !isSuperAdmin && (usuario.funcoes ?? []).includes('admin')
  const showOrgSection = isOrgAdmin && orgInicial !== null
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // ── Estado do formulário de org ────────────────────────────────────────────
  const [form, setForm] = useState({
    nome:           orgInicial?.nome          ?? '',
    nome_curto:     orgInicial?.nome_curto    ?? '',
    tipo:           orgInicial?.tipo          ?? 'cooperativa',
    cnpj:           orgInicial?.cnpj          ?? '',
    email:          orgInicial?.email         ?? '',
    telefone:       orgInicial?.telefone      ?? '',
    site:           orgInicial?.site          ?? '',
    cep:            orgInicial?.cep           ?? '',
    logradouro:     orgInicial?.logradouro    ?? '',
    numero:         orgInicial?.numero        ?? '',
    complemento:    orgInicial?.complemento   ?? '',
    bairro:         orgInicial?.bairro        ?? '',
    cidade:         orgInicial?.cidade        ?? '',
    estado:         orgInicial?.estado        ?? '',
    data_fundacao:  orgInicial?.data_fundacao ?? '',
    registro_juceb: orgInicial?.registro_juceb ?? '',
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
    if (!orgInicial) return
    setSalvando(true)
    setErro('')
    setSucesso('')

    const res = await salvarOrganizacao(form)

    if (res.error) {
      setErro('Erro ao salvar: ' + res.error)
    } else {
      setSucesso('Dados salvos com sucesso.')
      setTimeout(() => setSucesso(''), 3000)
      router.refresh()
    }
    setSalvando(false)
  }

  // ── Estado do perfil de captação ───────────────────────────────────────────
  const [perfil, setPerfil] = useState({
    areas_tematicas: perfilCaptacao?.areas_tematicas ?? [],
    publicos_alvo:   perfilCaptacao?.publicos_alvo   ?? [],
    abrangencia:     perfilCaptacao?.abrangencia     ?? [],
    municipios:      perfilCaptacao?.municipios      ?? [],
    porte_min:       perfilCaptacao?.porte_min != null ? String(perfilCaptacao.porte_min) : '',
    porte_max:       perfilCaptacao?.porte_max != null ? String(perfilCaptacao.porte_max) : '',
    idiomas:         perfilCaptacao?.idiomas         ?? ['pt'],
    descricao_org:   perfilCaptacao?.descricao_org   ?? '',
  })

  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [erroPerfil, setErroPerfil]         = useState('')
  const [sucessoPerfil, setSucessoPerfil]   = useState('')

  const [municipiosRaw, setMunicipiosRaw]       = useState(perfilCaptacao?.municipios?.join(', ') ?? '')
  const [outroAreaInput, setOutroAreaInput]     = useState('')
  const [outroAreaAberto, setOutroAreaAberto]   = useState(false)
  const [outroPubInput, setOutroPubInput]       = useState('')
  const [outroPubAberto, setOutroPubAberto]     = useState(false)

  function addCustom(campo: 'areas_tematicas' | 'publicos_alvo', valor: string) {
    const v = valor.trim()
    if (!v) return
    setPerfil(prev => {
      const arr = prev[campo] as string[]
      if (arr.includes(v)) return prev
      return { ...prev, [campo]: [...arr, v] }
    })
  }

  function toggleArray(campo: 'areas_tematicas' | 'publicos_alvo' | 'abrangencia' | 'idiomas', valor: string) {
    setPerfil(prev => {
      const arr = prev[campo] as string[]
      return {
        ...prev,
        [campo]: arr.includes(valor) ? arr.filter(v => v !== valor) : [...arr, valor],
      }
    })
  }

  async function handleSalvarPerfil() {
    setSalvandoPerfil(true)
    setErroPerfil('')
    setSucessoPerfil('')

    const res = await salvarPerfilCaptacao({
      areas_tematicas: perfil.areas_tematicas,
      publicos_alvo:   perfil.publicos_alvo,
      abrangencia:     perfil.abrangencia,
      municipios:      municipiosRaw.split(',').map(v => v.trim()).filter(Boolean),
      idiomas:         perfil.idiomas,
      porte_min:       perfil.porte_min ? parseFloat(perfil.porte_min) : null,
      porte_max:       perfil.porte_max ? parseFloat(perfil.porte_max) : null,
      descricao_org:   perfil.descricao_org || null,
    })

    if (res.error) {
      setErroPerfil(res.error)
    } else {
      setSucessoPerfil('Perfil de captação salvo com sucesso.')
      setTimeout(() => setSucessoPerfil(''), 3000)
    }
    setSalvandoPerfil(false)
  }

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '760px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Configurações</h1>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
          {showOrgSection ? 'Perfil pessoal e dados da organização' : 'Perfil pessoal'}
        </p>
      </div>

      {/* Perfil do usuário — visível para todos */}
      <PerfilUsuario usuario={usuario} />

      {/* Seções de org — visíveis apenas para admins da org */}
      {showOrgSection && <>

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

      {/* ── Captação de Recursos ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Captação de Recursos</div>
          <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
            Perfil da organização — usado pelo Radar para calcular compatibilidade com editais.
          </p>
        </div>

        {erroPerfil && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>
            {erroPerfil}
          </div>
        )}
        {sucessoPerfil && (
          <div style={{ background: '#E6F7F1', border: '1px solid #1D9E7533', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#166534', marginBottom: '1rem' }}>
            ✓ {sucessoPerfil}
          </div>
        )}

        {/* Áreas temáticas */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Label>Áreas temáticas</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {AREAS_CAPTACAO.filter(a => a !== 'outro').map(area => {
              const sel = perfil.areas_tematicas.includes(area)
              return (
                <button
                  key={area} type="button"
                  onClick={() => toggleArray('areas_tematicas', area)}
                  style={{
                    fontSize: '12px', padding: '4px 10px', borderRadius: '12px',
                    border: `1px solid ${sel ? TEAL : '#d5d3cc'}`,
                    background: sel ? '#E6F7F1' : '#fff',
                    color: sel ? TEAL : '#555',
                    cursor: 'pointer', fontWeight: sel ? '600' : '400',
                  }}
                >
                  {area}
                </button>
              )
            })}
            {perfil.areas_tematicas.filter(a => !AREAS_CAPTACAO.includes(a)).map(area => (
              <span key={area} style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '12px',
                border: '1px dashed #1D9E75', background: '#f0fdf9',
                color: TEAL, display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500',
              }}>
                {area}
                <button
                  type="button"
                  onClick={() => setPerfil(p => ({ ...p, areas_tematicas: p.areas_tematicas.filter(v => v !== area) }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: '13px', padding: 0, lineHeight: 1 }}
                >×</button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setOutroAreaAberto(v => !v)}
              style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '12px',
                border: `1px dashed ${outroAreaAberto ? TEAL : '#d5d3cc'}`,
                background: outroAreaAberto ? '#E6F7F1' : '#fff',
                color: outroAreaAberto ? TEAL : '#888',
                cursor: 'pointer',
              }}
            >
              + outro
            </button>
          </div>
          {outroAreaAberto && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Digite a área e pressione Enter"
                value={outroAreaInput}
                onChange={e => setOutroAreaInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustom('areas_tematicas', outroAreaInput)
                    setOutroAreaInput('')
                  }
                }}
                style={{ ...inputStyle, flex: 1 }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => { addCustom('areas_tematicas', outroAreaInput); setOutroAreaInput('') }}
                style={{ padding: '9px 12px', background: TEAL, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px' }}
              >+</button>
            </div>
          )}
        </div>

        {/* Público-alvo */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Label>Público-alvo</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {PUBLICOS_ALVO.filter(p => p !== 'outro').map(pub => {
              const sel = perfil.publicos_alvo.includes(pub)
              return (
                <button
                  key={pub} type="button"
                  onClick={() => toggleArray('publicos_alvo', pub)}
                  style={{
                    fontSize: '12px', padding: '4px 10px', borderRadius: '12px',
                    border: `1px solid ${sel ? TEAL : '#d5d3cc'}`,
                    background: sel ? '#E6F7F1' : '#fff',
                    color: sel ? TEAL : '#555',
                    cursor: 'pointer', fontWeight: sel ? '600' : '400',
                  }}
                >
                  {pub}
                </button>
              )
            })}
            {perfil.publicos_alvo.filter(p => !PUBLICOS_ALVO.includes(p)).map(pub => (
              <span key={pub} style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '12px',
                border: '1px dashed #1D9E75', background: '#f0fdf9',
                color: TEAL, display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500',
              }}>
                {pub}
                <button
                  type="button"
                  onClick={() => setPerfil(p => ({ ...p, publicos_alvo: p.publicos_alvo.filter(v => v !== pub) }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: '13px', padding: 0, lineHeight: 1 }}
                >×</button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setOutroPubAberto(v => !v)}
              style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '12px',
                border: `1px dashed ${outroPubAberto ? TEAL : '#d5d3cc'}`,
                background: outroPubAberto ? '#E6F7F1' : '#fff',
                color: outroPubAberto ? TEAL : '#888',
                cursor: 'pointer',
              }}
            >
              + outro
            </button>
          </div>
          {outroPubAberto && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Digite o público e pressione Enter"
                value={outroPubInput}
                onChange={e => setOutroPubInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustom('publicos_alvo', outroPubInput)
                    setOutroPubInput('')
                  }
                }}
                style={{ ...inputStyle, flex: 1 }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => { addCustom('publicos_alvo', outroPubInput); setOutroPubInput('') }}
                style={{ padding: '9px 12px', background: TEAL, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px' }}
              >+</button>
            </div>
          )}
        </div>

        {/* Abrangência geográfica */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Label>Abrangência geográfica</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
            {ABRANGENCIAS.map(ab => (
              <label key={ab} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#444', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={perfil.abrangencia.includes(ab)}
                  onChange={() => toggleArray('abrangencia', ab)}
                  style={{ accentColor: TEAL, width: '15px', height: '15px' }}
                />
                {ab.charAt(0).toUpperCase() + ab.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* Municípios */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Label>Municípios de atuação</Label>
          <textarea
            value={municipiosRaw}
            onChange={e => setMunicipiosRaw(e.target.value)}
            rows={2}
            placeholder="ex: Ibirataia, Jequié, Amargosa"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>Separe por vírgula</div>
        </div>

        {/* Porte de projeto */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Label>Porte de projeto (R$)</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Valor mínimo</div>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={perfil.porte_min}
                onChange={e => setPerfil(p => ({ ...p, porte_min: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = TEAL}
                onBlur={e => e.target.style.borderColor = '#d5d3cc'}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Valor máximo (opcional)</div>
              <input
                type="number"
                min="0"
                placeholder="sem limite"
                value={perfil.porte_max}
                onChange={e => setPerfil(p => ({ ...p, porte_max: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = TEAL}
                onBlur={e => e.target.style.borderColor = '#d5d3cc'}
              />
            </div>
          </div>
        </div>

        {/* Idiomas */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Label>Idiomas aceitos</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#888', cursor: 'not-allowed' }}>
              <input type="checkbox" checked disabled style={{ accentColor: TEAL, width: '15px', height: '15px' }} />
              Português
            </label>
            {[{ value: 'en', label: 'Inglês' }, { value: 'es', label: 'Espanhol' }].map(({ value, label }) => (
              <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#444', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={perfil.idiomas.includes(value)}
                  onChange={() => toggleArray('idiomas', value)}
                  style={{ accentColor: TEAL, width: '15px', height: '15px' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Descrição da organização */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Label>Descrição da organização</Label>
          <textarea
            value={perfil.descricao_org}
            onChange={e => setPerfil(p => ({ ...p, descricao_org: e.target.value }))}
            rows={4}
            placeholder="Ex: Cooperativa de agricultores familiares do Baixo Sul da Bahia, com foco em cacau, agrofloresta e galinha caipira..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = TEAL}
            onBlur={e => e.target.style.borderColor = '#d5d3cc'}
          />
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>
            Usado pelo Claude para analisar compatibilidade com editais.
          </div>
        </div>

        <button
          type="button"
          onClick={handleSalvarPerfil}
          disabled={salvandoPerfil}
          style={{
            padding: '10px 24px', background: salvandoPerfil ? '#57C4A3' : TEAL,
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '14px', fontWeight: '600',
            cursor: salvandoPerfil ? 'not-allowed' : 'pointer',
          }}
        >
          {salvandoPerfil ? 'Salvando...' : 'Salvar perfil de captação'}
        </button>
      </div>

      </>}
    </div>
  )
}
