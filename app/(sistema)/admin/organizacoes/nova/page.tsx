'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TipoOrganizacao, PlanoOrganizacao } from '@/types/database'
import { criarOrganizacao } from './actions'
import { MODULOS_OPCIONAIS, MODULOS } from '@/lib/modulos'
import { COR_POR_TIPO } from '@/lib/tema'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

type Aba = 'organizacao' | 'admin'

const ABAS: { id: Aba; label: string; icone: string }[] = [
  { id: 'organizacao', label: 'Organização', icone: '🏢' },
  { id: 'admin',       label: 'Usuário admin', icone: '👤' },
]

interface FormData {
  nome: string
  nome_curto: string
  cnpj: string
  tipo: TipoOrganizacao
  plano: PlanoOrganizacao
  cidade: string
  estado: string
  email: string
  telefone: string
  admin_nome: string
  admin_email: string
  admin_senha: string
  admin_senha_confirma: string
  modulos_extras: string[]
  cor_primaria: string | null
}

const FORM_INICIAL: FormData = {
  nome: '', nome_curto: '', cnpj: '',
  tipo: 'cooperativa', plano: 'essencial',
  cidade: '', estado: '', email: '', telefone: '',
  admin_nome: '', admin_email: '', admin_senha: '', admin_senha_confirma: '',
  modulos_extras: [], cor_primaria: null,
}

// Swatches oferecidos no seletor de cor — as três cores padrão por tipo.
const CORES_SWATCH = [
  { hex: COR_POR_TIPO.cooperativa, label: 'Verde (cooperativa)' },
  { hex: COR_POR_TIPO.associacao,  label: 'Teal (associação)' },
  { hex: COR_POR_TIPO.central,     label: 'Azul (central)' },
]

function InputGroup({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #d5d3cc', borderRadius: '8px',
  fontSize: '13px', background: '#fff', color: '#1a1a1a',
  outline: 'none', boxSizing: 'border-box' as const,
}

export default function NovaOrganizacaoPage() {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('organizacao')
  const [form, setForm] = useState<FormData>(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function set(campo: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [campo]: e.target.value }))
  }

  function toggleModulo(id: string) {
    setForm(prev => ({
      ...prev,
      modulos_extras: prev.modulos_extras.includes(id)
        ? prev.modulos_extras.filter(m => m !== id)
        : [...prev.modulos_extras, id],
    }))
  }

  function validarOrg(): string {
    if (!form.nome.trim()) return 'Nome da organização é obrigatório.'
    if (!form.cidade.trim()) return 'Cidade é obrigatória.'
    if (!form.estado) return 'Estado é obrigatório.'
    return ''
  }

  function validarAdmin(): string {
    if (!form.admin_nome.trim()) return 'Nome do administrador é obrigatório.'
    if (!form.admin_email.trim()) return 'E-mail do administrador é obrigatório.'
    if (!form.admin_senha) return 'Senha temporária é obrigatória.'
    if (form.admin_senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    if (form.admin_senha !== form.admin_senha_confirma) return 'As senhas não coincidem.'
    return ''
  }

  function avancar() {
    const erroOrg = validarOrg()
    if (erroOrg) { setErro(erroOrg); return }
    setErro('')
    setAba('admin')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const erroAdmin = validarAdmin()
    if (erroAdmin) { setErro(erroAdmin); return }
    setErro('')
    setSalvando(true)

    const resultado = await criarOrganizacao({
      nome: form.nome, nome_curto: form.nome_curto,
      cnpj: form.cnpj, tipo: form.tipo, plano: form.plano,
      cidade: form.cidade, estado: form.estado,
      email: form.email, telefone: form.telefone,
      admin_nome: form.admin_nome, admin_email: form.admin_email,
      admin_senha: form.admin_senha,
      modulos_extras: form.modulos_extras,
      cor_primaria: form.cor_primaria,
    })

    if (resultado.error) {
      setErro(resultado.error)
      setSalvando(false)
      return
    }

    router.push(`/admin/organizacoes/${resultado.orgId}`)
  }

  const abaAtual = ABAS.findIndex(a => a.id === aba)

  return (
    <div style={{ maxWidth: '640px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
        <button
          onClick={() => router.push('/admin')}
          style={{ fontSize: '13px', color: '#635BFF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Admin
        </button>
        <span style={{ color: '#aaa', fontSize: '13px' }}>›</span>
        <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>Nova organização</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Nova organização</h1>
        <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
          Crie uma organização e seu primeiro usuário administrador.
        </p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: '#f5f5f2', borderRadius: '10px', padding: '4px' }}>
        {ABAS.map((a, idx) => {
          const ativo = a.id === aba
          const concluido = idx < abaAtual
          return (
            <button
              key={a.id}
              onClick={() => {
                if (idx === 1) {
                  const erroOrg = validarOrg()
                  if (erroOrg) { setErro(erroOrg); return }
                }
                setErro('')
                setAba(a.id)
              }}
              style={{
                flex: 1, padding: '8px 12px',
                background: ativo ? '#fff' : 'transparent',
                border: 'none', borderRadius: '8px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '6px',
                boxShadow: ativo ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span style={{ fontSize: '14px' }}>{concluido ? '✅' : a.icone}</span>
              <span style={{ fontSize: '13px', fontWeight: ativo ? '600' : '400', color: ativo ? '#1a1a1a' : '#888' }}>
                {a.label}
              </span>
            </button>
          )
        })}
      </div>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '13px', color: '#dc2626' }}>
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.5rem' }}>
          {/* ABA: Organização */}
          {aba === 'organizacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InputGroup label="Nome da organização" required>
                <input
                  type="text" value={form.nome} onChange={set('nome')}
                  placeholder="Ex: Cooperativa Agrícola do Vale"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#635BFF')}
                  onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                />
              </InputGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <InputGroup label="Nome curto">
                  <input
                    type="text" value={form.nome_curto} onChange={set('nome_curto')}
                    placeholder="Ex: COOPVALE"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="CNPJ">
                  <input
                    type="text" value={form.cnpj} onChange={set('cnpj')}
                    placeholder="00.000.000/0001-00"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <InputGroup label="Tipo" required>
                  <select value={form.tipo} onChange={set('tipo')} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="cooperativa">Cooperativa</option>
                    <option value="associacao">Associação</option>
                    <option value="central">Central</option>
                  </select>
                </InputGroup>
                <InputGroup label="Plano inicial" required>
                  <select value={form.plano} onChange={set('plano')} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="gratuito">Gratuito</option>
                    <option value="essencial">Essencial</option>
                    <option value="profissional">Profissional</option>
                    <option value="agro">Agro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </InputGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
                <InputGroup label="Cidade" required>
                  <input
                    type="text" value={form.cidade} onChange={set('cidade')}
                    placeholder="Ex: Feira de Santana"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="UF" required>
                  <select value={form.estado} onChange={set('estado')} style={{ ...inputStyle, cursor: 'pointer', minWidth: '80px' }}>
                    <option value="">UF</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </InputGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <InputGroup label="E-mail">
                  <input
                    type="email" value={form.email} onChange={set('email')}
                    placeholder="contato@cooperativa.coop.br"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Telefone">
                  <input
                    type="tel" value={form.telefone} onChange={set('telefone')}
                    placeholder="(00) 00000-0000"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              {/* Módulos — base sempre incluído (travado), opcionais liga/desliga */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Módulos
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {MODULOS.filter(m => m.base).map(m => (
                    <span key={m.id} title={m.descricao} style={{
                      fontSize: '11px', fontWeight: '600', padding: '4px 10px',
                      borderRadius: '20px', background: '#f0eeea', color: '#888',
                    }}>
                      {m.nome} ✓
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {MODULOS_OPCIONAIS.map(m => {
                    const ativo = form.modulos_extras.includes(m.id)
                    return (
                      <label key={m.id} title={m.descricao} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                        padding: '8px 12px', border: `1px solid ${ativo ? '#635BFF' : '#e5e3dc'}`,
                        borderRadius: '8px', background: ativo ? '#EEF0FF' : '#fff',
                      }}>
                        <input type="checkbox" checked={ativo} onChange={() => toggleModulo(m.id)}
                          style={{ accentColor: '#635BFF', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{m.nome}</span>
                        <span style={{ fontSize: '11px', color: '#888' }}>{m.descricao}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Cor da marca — override opcional; vazio usa o padrão do tipo escolhido acima */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Cor da marca
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" title="Usar padrão do tipo"
                    onClick={() => setForm(prev => ({ ...prev, cor_primaria: null }))}
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: COR_POR_TIPO[form.tipo],
                      border: form.cor_primaria === null ? '2px solid #1a1a1a' : '2px solid transparent',
                      cursor: 'pointer', boxShadow: '0 0 0 1px #e5e3dc',
                    }}
                  />
                  {CORES_SWATCH.map(c => (
                    <button key={c.hex} type="button" title={c.label}
                      onClick={() => setForm(prev => ({ ...prev, cor_primaria: c.hex }))}
                      style={{
                        width: '30px', height: '30px', borderRadius: '50%', background: c.hex,
                        border: form.cor_primaria === c.hex ? '2px solid #1a1a1a' : '2px solid transparent',
                        cursor: 'pointer', boxShadow: '0 0 0 1px #e5e3dc',
                      }}
                    />
                  ))}
                  <input type="color" value={form.cor_primaria ?? COR_POR_TIPO[form.tipo]}
                    onChange={e => setForm(prev => ({ ...prev, cor_primaria: e.target.value }))}
                    style={{ width: '36px', height: '30px', padding: 0, border: '1px solid #d5d3cc', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    {form.cor_primaria ? form.cor_primaria : `Padrão do tipo (${COR_POR_TIPO[form.tipo]})`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ABA: Usuário admin */}
          {aba === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#EEF0FF', border: '1px solid #635BFF33', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#4840CC' }}>
                Este usuário será criado com <strong>role = org_admin</strong> e terá acesso completo à organização.
              </div>
              <InputGroup label="Nome completo" required>
                <input
                  type="text" value={form.admin_nome} onChange={set('admin_nome')}
                  placeholder="Ex: João da Silva"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#635BFF')}
                  onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                />
              </InputGroup>
              <InputGroup label="E-mail de acesso" required>
                <input
                  type="email" value={form.admin_email} onChange={set('admin_email')}
                  placeholder="admin@cooperativa.coop.br"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#635BFF')}
                  onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                />
              </InputGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <InputGroup label="Senha temporária" required>
                  <input
                    type="password" value={form.admin_senha} onChange={set('admin_senha')}
                    placeholder="Mín. 6 caracteres"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Confirmar senha" required>
                  <input
                    type="password" value={form.admin_senha_confirma} onChange={set('admin_senha_confirma')}
                    placeholder="Repetir senha"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>
            </div>
          )}
        </div>

        {/* Botões de navegação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', gap: '8px' }}>
          <button
            type="button"
            onClick={() => aba === 'admin' ? setAba('organizacao') : router.push('/admin')}
            style={{
              padding: '9px 18px', background: 'transparent',
              border: '1px solid #d5d3cc', borderRadius: '8px',
              fontSize: '13px', color: '#555', cursor: 'pointer',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#f5f5f2')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
          >
            {aba === 'admin' ? '← Voltar' : 'Cancelar'}
          </button>

          {aba === 'organizacao' ? (
            <button
              type="button"
              onClick={avancar}
              style={{
                padding: '9px 18px', background: '#635BFF', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '13px',
                fontWeight: '600', cursor: 'pointer',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#178a64')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#635BFF')}
            >
              Próximo →
            </button>
          ) : (
            <button
              type="submit"
              disabled={salvando}
              style={{
                padding: '9px 18px', background: salvando ? '#aaa' : '#635BFF', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '13px',
                fontWeight: '600', cursor: salvando ? 'not-allowed' : 'pointer',
              }}
            >
              {salvando ? 'Criando…' : 'Criar organização'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
