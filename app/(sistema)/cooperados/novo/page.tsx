'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
import { cpfInvalidoMsg } from '@/lib/utils/cpf'
import { vincularCooperadoComoProdutor } from '@/lib/comercializacao/produtores.actions'
import BannerLimiteAtingido from '@/components/BannerLimiteAtingido'
import type { ResultadoLimite } from '@/lib/assinatura'
import type { StatusCooperado } from '@/types/database'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const CAF_SITUACOES = ['ativo', 'vencido', 'em_renovacao', 'cancelado']

type Aba = 'pessoal' | 'contato' | 'propriedade' | 'cadastro'

const ABAS: { id: Aba; label: string; icone: string }[] = [
  { id: 'pessoal',     label: 'Dados pessoais',     icone: '👤' },
  { id: 'contato',     label: 'Contato / Endereço', icone: '📍' },
  { id: 'propriedade', label: 'Propriedade rural',  icone: '🌱' },
  { id: 'cadastro',    label: 'Cadastro',            icone: '📋' },
]

interface FormData {
  tipo: 'pessoa_fisica' | 'pessoa_juridica'
  nome_completo: string
  cpf: string
  rg: string
  data_nascimento: string
  sexo: 'M' | 'F' | 'outro' | ''
  cnpj_pj: string
  representante_nome: string
  representante_cpf: string
  email: string
  telefone: string
  whatsapp: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  nome_propriedade: string
  area_total_ha: string
  latitude: string
  longitude: string
  caf_numero: string
  caf_situacao: string
  caf_validade: string
  dap_numero: string
  status: StatusCooperado
  data_admissao: string
  numero_matricula: string
  motivo_saida: string
}

const FORM_INICIAL: FormData = {
  tipo: 'pessoa_fisica',
  nome_completo: '', cpf: '', rg: '', data_nascimento: '', sexo: '',
  cnpj_pj: '', representante_nome: '', representante_cpf: '',
  email: '', telefone: '', whatsapp: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  nome_propriedade: '', area_total_ha: '', latitude: '', longitude: '',
  caf_numero: '', caf_situacao: '', caf_validade: '', dap_numero: '',
  status: 'proposta', data_admissao: '', numero_matricula: '', motivo_saida: '',
}

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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

export default function NovoCooperadoPage() {
  const router = useRouter()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('pessoal')
  const [form, setForm] = useState<FormData>(FORM_INICIAL)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [limiteInfo, setLimiteInfo] = useState<ResultadoLimite | null>(null)

  const set = (campo: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [campo]: e.target.value }))

  async function buscarCEP(cep: string) {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return
    setBuscandoCep(true)
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
    } catch {
      // silencia erro de rede
    } finally {
      setBuscandoCep(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome_completo.trim()) {
      setErro('Nome completo é obrigatório.')
      setAbaAtiva('pessoal')
      return
    }
    if (form.tipo === 'pessoa_fisica' && form.cpf) {
      const erroCpf = cpfInvalidoMsg(form.cpf)
      if (erroCpf) { setErro(erroCpf); setAbaAtiva('pessoal'); return }
    }
    if (form.tipo === 'pessoa_juridica' && form.representante_cpf) {
      const erroCpf = cpfInvalidoMsg(form.representante_cpf)
      if (erroCpf) { setErro(erroCpf); setAbaAtiva('pessoal'); return }
    }
    setSalvando(true)
    setErro('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('organizacao_id')
      .eq('id', user.id)
      .single()

    if (!usuario?.organizacao_id) {
      setErro('Usuário sem organização vinculada.')
      setSalvando(false)
      return
    }

    // ── GUARD DE LIMITE ──────────────────────────────────────
    const { verificarLimiteFiliados } = await import('@/lib/assinatura')
    const limite = await verificarLimiteFiliados(usuario.organizacao_id)
    if (!limite.permitido) {
      setLimiteInfo(limite)
      setSalvando(false)
      return
    }
    // ────────────────────────────────────────────────────────

    const cpfLimpo = form.tipo === 'pessoa_fisica' ? form.cpf.replace(/\D/g, '') || null : null

    const payload = {
      organizacao_id: usuario.organizacao_id,
      tipo: form.tipo,
      nome_completo: form.nome_completo.trim(),
      cpf:           cpfLimpo,
      rg:            form.tipo === 'pessoa_fisica' ? form.rg.trim() || null : null,
      data_nascimento: form.tipo === 'pessoa_fisica' ? form.data_nascimento || null : null,
      sexo:          form.tipo === 'pessoa_fisica' ? (form.sexo as 'M' | 'F' | 'outro' | null) || null : null,
      cnpj_pj:       form.tipo === 'pessoa_juridica' ? form.cnpj_pj.replace(/\D/g, '') || null : null,
      representante_nome: form.tipo === 'pessoa_juridica' ? form.representante_nome.trim() || null : null,
      representante_cpf:  form.tipo === 'pessoa_juridica' ? form.representante_cpf.replace(/\D/g, '') || null : null,
      email:         form.email.trim() || null,
      telefone:      form.telefone.trim() || null,
      whatsapp:      form.whatsapp.trim() || null,
      cep:           form.cep.replace(/\D/g, '') || null,
      logradouro:    form.logradouro.trim() || null,
      numero:        form.numero.trim() || null,
      complemento:   form.complemento.trim() || null,
      bairro:        form.bairro.trim() || null,
      cidade:        form.cidade.trim() || null,
      estado:        form.estado || null,
      nome_propriedade: form.nome_propriedade.trim() || null,
      area_total_ha: form.area_total_ha ? parseFloat(form.area_total_ha) : null,
      latitude:      form.latitude ? parseFloat(form.latitude) : null,
      longitude:     form.longitude ? parseFloat(form.longitude) : null,
      caf_numero:    form.caf_numero.trim() || null,
      caf_situacao:  form.caf_situacao || null,
      caf_validade:  form.caf_validade || null,
      dap_numero:    form.dap_numero.trim() || null,
      status:        form.status,
      data_admissao: form.data_admissao || null,
      numero_matricula: form.numero_matricula.trim() || null,
      motivo_saida:  form.motivo_saida.trim() || null,
    }

    const { data, error } = await supabase
      .from('cooperados')
      .insert(payload)
      .select()
      .single()

    if (error) {
      setErro(traduzirErro(error.message))
      setSalvando(false)
      return
    }

    // ── VÍNCULO AUTOMÁTICO COOPERADO → PRODUTOR ──────────────
    try {
      await vincularCooperadoComoProdutor({
        cooperado_id: data.id,
        organizacao_id: usuario.organizacao_id,
        nome: form.nome_completo.trim(),
        cpf: cpfLimpo,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        municipio: form.cidade.trim() || null,
        endereco: form.logradouro.trim() ? `${form.logradouro.trim()}${form.numero ? ', ' + form.numero : ''}` : null,
        nome_propriedade: form.nome_propriedade.trim() || null,
      })
    } catch (eVinculo: any) {
      // Não bloqueia o cadastro — cooperado foi salvo, apenas loga o erro
      console.error('[NovoCooperado] falha ao vincular produtor:', eVinculo?.message ?? eVinculo)
    }
    // ────────────────────────────────────────────────────────

    router.push(`/cooperados/${data.id}`)
  }

  const abaIdx = ABAS.findIndex(a => a.id === abaAtiva)

  return (
    <>
      <style>{`
        .nc-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .nc-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .nc-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .nc-content { padding: 16px; }
        }
      `}</style>

      <header className="nc-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: '1px solid #E5E3DC',
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-user-plus" style={{ fontSize: 20, color: '#635BFF' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#1C1917', margin: 0, lineHeight: 1.2 }}>Novo Filiado</h1>
            <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>
              <button onClick={() => router.push('/cooperados')} style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}>Cooperados</button>
              {' / '}Novo
            </div>
          </div>
        </div>
      </header>

      <div className="nc-content" style={{ background: '#F8F7F4', margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>
      <div style={{ maxWidth: '760px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {limiteInfo && !limiteInfo.permitido && (
        <BannerLimiteAtingido
          planoAtual={limiteInfo.plano}
          totalAtual={limiteInfo.totalAtual}
          limite={limiteInfo.limite!}
        />
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid #e5e3dc', paddingBottom: '0' }}>
        {ABAS.map((aba, i) => {
          const ativo = aba.id === abaAtiva
          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              style={{
                padding: '9px 16px', background: 'none', border: 'none',
                borderBottom: ativo ? '2px solid #635BFF' : '2px solid transparent',
                cursor: 'pointer', fontSize: '13px', fontWeight: ativo ? '600' : '400',
                color: ativo ? '#635BFF' : '#666', display: 'flex', alignItems: 'center', gap: '6px',
                marginBottom: '-1px', transition: 'all 0.15s',
              }}
            >
              <span style={{ opacity: ativo ? 1 : 0.6 }}>{aba.icone}</span>
              <span>{i + 1}. {aba.label}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.75rem' }}>

          {/* ─── ABA 1: DADOS PESSOAIS ─── */}
          {abaAtiva === 'pessoal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InputGroup label="Tipo de pessoa" required>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { val: 'pessoa_fisica', label: '👤 Pessoa Física' },
                    { val: 'pessoa_juridica', label: '🏢 Pessoa Jurídica' },
                  ].map(op => (
                    <label key={op.val} style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px', border: `1px solid ${form.tipo === op.val ? '#635BFF' : '#d5d3cc'}`,
                      borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                      background: form.tipo === op.val ? '#EEF0FF' : '#fafaf8',
                      color: form.tipo === op.val ? '#4840CC' : '#555', fontWeight: form.tipo === op.val ? '600' : '400',
                    }}>
                      <input
                        type="radio" name="tipo" value={op.val}
                        checked={form.tipo === op.val}
                        onChange={set('tipo')}
                        style={{ accentColor: '#635BFF' }}
                      />
                      {op.label}
                    </label>
                  ))}
                </div>
              </InputGroup>

              <InputGroup label="Nome completo" required>
                <input type="text" value={form.nome_completo} onChange={set('nome_completo')}
                  placeholder={form.tipo === 'pessoa_fisica' ? 'João da Silva' : 'Razão social'}
                  required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#635BFF')}
                  onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                />
              </InputGroup>

              {form.tipo === 'pessoa_fisica' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <InputGroup label="CPF">
                      <input type="text" value={form.cpf}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                          const masked = digits
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                          setForm(prev => ({ ...prev, cpf: masked }))
                        }}
                        placeholder="000.000.000-00" maxLength={14} style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = '#635BFF')}
                        onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                      />
                    </InputGroup>
                    <InputGroup label="RG">
                      <input type="text" value={form.rg} onChange={set('rg')}
                        placeholder="0000000" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = '#635BFF')}
                        onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                      />
                    </InputGroup>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <InputGroup label="Data de nascimento">
                      <input type="date" value={form.data_nascimento} onChange={set('data_nascimento')}
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = '#635BFF')}
                        onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                      />
                    </InputGroup>
                    <InputGroup label="Sexo">
                      <select value={form.sexo} onChange={set('sexo')} style={inputStyle}>
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="outro">Outro</option>
                      </select>
                    </InputGroup>
                  </div>
                </>
              ) : (
                <>
                  <InputGroup label="CNPJ">
                    <input type="text" value={form.cnpj_pj} onChange={set('cnpj_pj')}
                      placeholder="00.000.000/0001-00" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#635BFF')}
                      onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                    />
                  </InputGroup>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <InputGroup label="Nome do representante">
                      <input type="text" value={form.representante_nome} onChange={set('representante_nome')}
                        placeholder="Nome completo" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = '#635BFF')}
                        onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                      />
                    </InputGroup>
                    <InputGroup label="CPF do representante">
                      <input type="text" value={form.representante_cpf} onChange={set('representante_cpf')}
                        placeholder="000.000.000-00" maxLength={14} style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = '#635BFF')}
                        onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                      />
                    </InputGroup>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── ABA 2: CONTATO / ENDEREÇO ─── */}
          {abaAtiva === 'contato' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <InputGroup label="E-mail">
                  <input type="email" value={form.email} onChange={set('email')}
                    placeholder="nome@email.com" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Telefone">
                  <input type="tel" value={form.telefone}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                      const masked = digits.length <= 10
                        ? digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
                        : digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
                      setForm(prev => ({ ...prev, telefone: masked }))
                    }}
                    placeholder="(00) 00000-0000" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="WhatsApp">
                  <input type="tel" value={form.whatsapp}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                      const masked = digits.length <= 10
                        ? digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
                        : digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
                      setForm(prev => ({ ...prev, whatsapp: masked }))
                    }}
                    placeholder="(00) 00000-0000" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f0eeea', margin: '0.5rem 0' }} />
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endereço</p>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                <InputGroup label="CEP">
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text" value={form.cep}
                      onChange={e => {
                        set('cep')(e)
                        if (e.target.value.replace(/\D/g, '').length === 8) {
                          buscarCEP(e.target.value)
                        }
                      }}
                      placeholder="00000-000" maxLength={9}
                      style={{ ...inputStyle, paddingRight: buscandoCep ? '32px' : undefined }}
                      onFocus={e => (e.target.style.borderColor = '#635BFF')}
                      onBlur={e => {
                        e.target.style.borderColor = '#d5d3cc'
                        buscarCEP(form.cep)
                      }}
                    />
                    {buscandoCep && (
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#635BFF' }}>
                        ⟳
                      </span>
                    )}
                  </div>
                </InputGroup>
                <InputGroup label="Logradouro">
                  <input type="text" value={form.logradouro} onChange={set('logradouro')}
                    placeholder="Rua, Avenida…" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '12px' }}>
                <InputGroup label="Número">
                  <input type="text" value={form.numero} onChange={set('numero')}
                    placeholder="123" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Complemento">
                  <input type="text" value={form.complemento} onChange={set('complemento')}
                    placeholder="Apto, sala…" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Bairro">
                  <input type="text" value={form.bairro} onChange={set('bairro')}
                    placeholder="Bairro" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px' }}>
                <InputGroup label="Cidade">
                  <input type="text" value={form.cidade} onChange={set('cidade')}
                    placeholder="Cidade" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Estado">
                  <select value={form.estado} onChange={set('estado')} style={inputStyle}>
                    <option value="">UF</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </InputGroup>
              </div>
            </div>
          )}

          {/* ─── ABA 3: PROPRIEDADE RURAL ─── */}
          {abaAtiva === 'propriedade' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f8fdf9', border: '1px solid #c4e9dc', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#4840CC' }}>
                💡 Preencha apenas se o cooperado possuir propriedade rural vinculada. Todos os campos são opcionais.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
                <InputGroup label="Nome da propriedade">
                  <input type="text" value={form.nome_propriedade} onChange={set('nome_propriedade')}
                    placeholder="Sítio São João" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Área total (ha)">
                  <input type="number" value={form.area_total_ha} onChange={set('area_total_ha')}
                    placeholder="12.5" min="0" step="0.01" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InputGroup label="Latitude">
                  <input type="number" value={form.latitude} onChange={set('latitude')}
                    placeholder="-15.7801" step="any" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Longitude">
                  <input type="number" value={form.longitude} onChange={set('longitude')}
                    placeholder="-47.9292" step="any" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f0eeea', margin: '0.25rem 0' }} />
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CAF / DAP</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InputGroup label="Número CAF">
                  <input type="text" value={form.caf_numero} onChange={set('caf_numero')}
                    placeholder="CAF-000000" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Situação CAF">
                  <select value={form.caf_situacao} onChange={set('caf_situacao')} style={inputStyle}>
                    <option value="">Selecione</option>
                    {CAF_SITUACOES.map(s => (
                      <option key={s} value={s}>
                        {s === 'ativo' ? 'Ativo' : s === 'vencido' ? 'Vencido' : s === 'em_renovacao' ? 'Em renovação' : 'Cancelado'}
                      </option>
                    ))}
                  </select>
                </InputGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InputGroup label="Validade CAF">
                  <input type="date" value={form.caf_validade} onChange={set('caf_validade')}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Número DAP">
                  <input type="text" value={form.dap_numero} onChange={set('dap_numero')}
                    placeholder="DAP-000000" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>
            </div>
          )}

          {/* ─── ABA 4: CADASTRO ─── */}
          {abaAtiva === 'cadastro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InputGroup label="Status" required>
                  <select value={form.status} onChange={set('status')} style={inputStyle}>
                    <option value="proposta">Proposta</option>
                    <option value="probatorio">Probatório</option>
                    <option value="ativo">Ativo</option>
                    <option value="inadimplente">Inadimplente</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="demitido">Demitido</option>
                    <option value="excluido">Excluído</option>
                  </select>
                </InputGroup>
                <InputGroup label="Número de matrícula">
                  <input type="text" value={form.numero_matricula} onChange={set('numero_matricula')}
                    placeholder="001" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              <InputGroup label="Data de admissão">
                <input type="date" value={form.data_admissao} onChange={set('data_admissao')}
                  style={{ ...inputStyle, maxWidth: '200px' }}
                  onFocus={e => (e.target.style.borderColor = '#635BFF')}
                  onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                />
              </InputGroup>

              {['suspenso', 'demitido', 'excluido'].includes(form.status) && (
                <InputGroup label="Motivo de saída / suspensão">
                  <textarea
                    value={form.motivo_saida}
                    onChange={set('motivo_saida')}
                    placeholder="Descreva o motivo…"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              )}
            </div>
          )}
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginTop: '1rem' }}>
            {erro}
          </div>
        )}

        {/* Navegação entre abas + submit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={() => abaIdx > 0 && setAbaAtiva(ABAS[abaIdx - 1].id)}
            disabled={abaIdx === 0}
            style={{
              padding: '9px 18px', border: '1px solid #d5d3cc', borderRadius: '8px',
              background: '#fff', fontSize: '13px', color: '#555', cursor: abaIdx === 0 ? 'not-allowed' : 'pointer',
              opacity: abaIdx === 0 ? 0.4 : 1,
            }}
          >
            ← Anterior
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {abaIdx < ABAS.length - 1 ? (
              <button
                type="button"
                onClick={() => setAbaAtiva(ABAS[abaIdx + 1].id)}
                style={{
                  padding: '9px 20px', border: 'none', borderRadius: '8px',
                  background: '#635BFF', color: '#fff', fontSize: '13px',
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
                  padding: '9px 24px', border: 'none', borderRadius: '8px',
                  background: salvando ? '#9F9BFF' : '#635BFF', color: '#fff',
                  fontSize: '13px', fontWeight: '600',
                  cursor: salvando ? 'not-allowed' : 'pointer',
                }}
              >
                {salvando ? 'Salvando…' : '✓ Salvar filiado'}
              </button>
            )}
          </div>
        </div>
      </form>
      </div>
      </div>
    </>
  )
}
