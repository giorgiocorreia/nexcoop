'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
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
  quota_parte: string
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

export default function EditarCooperadoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [abaAtiva, setAbaAtiva] = useState<Aba>('pessoal')
  const [form, setForm] = useState<FormData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Carrega cooperado existente
  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    supabase
      .from('cooperados')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErro('Cooperado não encontrado.')
          setCarregando(false)
          return
        }
        setForm({
          tipo:               data.tipo ?? 'pessoa_fisica',
          nome_completo:      data.nome_completo ?? '',
          cpf:                data.cpf ?? '',
          rg:                 data.rg ?? '',
          data_nascimento:    data.data_nascimento ?? '',
          sexo:               (data.sexo as 'M' | 'F' | 'outro' | '') ?? '',
          cnpj_pj:            data.cnpj_pj ?? '',
          representante_nome: data.representante_nome ?? '',
          representante_cpf:  data.representante_cpf ?? '',
          email:              data.email ?? '',
          telefone:           data.telefone ?? '',
          whatsapp:           data.whatsapp ?? '',
          cep:                data.cep ?? '',
          logradouro:         data.logradouro ?? '',
          numero:             data.numero ?? '',
          complemento:        data.complemento ?? '',
          bairro:             data.bairro ?? '',
          cidade:             data.cidade ?? '',
          estado:             data.estado ?? '',
          nome_propriedade:   data.nome_propriedade ?? '',
          area_total_ha:      data.area_total_ha != null ? String(data.area_total_ha) : '',
          latitude:           data.latitude != null ? String(data.latitude) : '',
          longitude:          data.longitude != null ? String(data.longitude) : '',
          caf_numero:         data.caf_numero ?? '',
          caf_situacao:       data.caf_situacao ?? '',
          caf_validade:       data.caf_validade ?? '',
          dap_numero:         data.dap_numero ?? '',
          status:             data.status ?? 'proposta',
          data_admissao:      data.data_admissao ?? '',
          numero_matricula:   data.numero_matricula ?? '',
          motivo_saida:       data.motivo_saida ?? '',
          quota_parte:        data.quota_parte != null ? String(data.quota_parte) : '',
        })
        setCarregando(false)
      })
  }, [id])

  const set = (campo: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => prev ? { ...prev, [campo]: e.target.value } : prev)

  async function buscarCEP(cep: string) {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => prev ? ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro:     data.bairro    || prev.bairro,
          cidade:     data.localidade || prev.cidade,
          estado:     data.uf        || prev.estado,
        }) : prev)
      }
    } catch {
      // silencia erro de rede
    } finally {
      setBuscandoCep(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.nome_completo.trim()) {
      setErro('Nome completo é obrigatório.')
      setAbaAtiva('pessoal')
      return
    }
    setSalvando(true)
    setErro('')

    const supabase = createClient()

    const payload = {
      tipo:               form.tipo,
      nome_completo:      form.nome_completo.trim(),
      cpf:                form.tipo === 'pessoa_fisica' ? form.cpf.replace(/\D/g, '') || null : null,
      rg:                 form.tipo === 'pessoa_fisica' ? form.rg.trim() || null : null,
      data_nascimento:    form.tipo === 'pessoa_fisica' ? form.data_nascimento || null : null,
      sexo:               form.tipo === 'pessoa_fisica' ? (form.sexo as 'M' | 'F' | 'outro' | null) || null : null,
      cnpj_pj:            form.tipo === 'pessoa_juridica' ? form.cnpj_pj.replace(/\D/g, '') || null : null,
      representante_nome: form.tipo === 'pessoa_juridica' ? form.representante_nome.trim() || null : null,
      representante_cpf:  form.tipo === 'pessoa_juridica' ? form.representante_cpf.replace(/\D/g, '') || null : null,
      email:              form.email.trim() || null,
      telefone:           form.telefone.trim() || null,
      whatsapp:           form.whatsapp.trim() || null,
      cep:                form.cep.replace(/\D/g, '') || null,
      logradouro:         form.logradouro.trim() || null,
      numero:             form.numero.trim() || null,
      complemento:        form.complemento.trim() || null,
      bairro:             form.bairro.trim() || null,
      cidade:             form.cidade.trim() || null,
      estado:             form.estado || null,
      nome_propriedade:   form.nome_propriedade.trim() || null,
      area_total_ha:      form.area_total_ha ? parseFloat(form.area_total_ha) : null,
      latitude:           form.latitude ? parseFloat(form.latitude) : null,
      longitude:          form.longitude ? parseFloat(form.longitude) : null,
      caf_numero:         form.caf_numero.trim() || null,
      caf_situacao:       form.caf_situacao || null,
      caf_validade:       form.caf_validade || null,
      dap_numero:         form.dap_numero.trim() || null,
      status:             form.status,
      data_admissao:      form.data_admissao || null,
      numero_matricula:   form.numero_matricula.trim() || null,
      motivo_saida:       form.motivo_saida.trim() || null,
      quota_parte:        form.quota_parte ? parseFloat(form.quota_parte) : null,
      atualizado_em:      new Date().toISOString(),
    }

    const { error } = await supabase
      .from('cooperados')
      .update(payload)
      .eq('id', id)

    if (error) {
      setErro(traduzirErro(error.message))
      setSalvando(false)
      return
    }

    router.push(`/cooperados/${id}`)
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' }}>
        Carregando...
      </div>
    )
  }

  if (!form) {
    return (
      <div style={{ color: '#dc2626', fontSize: '14px', padding: '2rem' }}>
        {erro || 'Filiado não encontrado.'}
      </div>
    )
  }

  const abaIdx = ABAS.findIndex(a => a.id === abaAtiva)

  return (
    <div style={{ maxWidth: '760px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push(`/cooperados/${id}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '4px' }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
            Editar filiado
          </h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>Atualize os dados nas abas abaixo</p>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid #e5e3dc' }}>
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
                      <input type="radio" name="tipo" value={op.val}
                        checked={form.tipo === op.val} onChange={set('tipo')}
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
                      <input type="text" value={form.cpf} onChange={set('cpf')}
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
                  <input type="tel" value={form.telefone} onChange={set('telefone')}
                    placeholder="(00) 00000-0000" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="WhatsApp">
                  <input type="tel" value={form.whatsapp} onChange={set('whatsapp')}
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
                    <input type="text" value={form.cep}
                      onChange={e => {
                        set('cep')(e)
                        if (e.target.value.replace(/\D/g, '').length === 8) buscarCEP(e.target.value)
                      }}
                      placeholder="00000-000" maxLength={9}
                      style={{ ...inputStyle, paddingRight: buscandoCep ? '32px' : undefined }}
                      onFocus={e => (e.target.style.borderColor = '#635BFF')}
                      onBlur={e => { e.target.style.borderColor = '#d5d3cc'; buscarCEP(form.cep) }}
                    />
                    {buscandoCep && (
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#635BFF' }}>⟳</span>
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
                💡 Preencha apenas se o membro possuir propriedade rural vinculada. Todos os campos são opcionais.
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InputGroup label="Data de admissão">
                  <input type="date" value={form.data_admissao} onChange={set('data_admissao')}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
                <InputGroup label="Quota-parte (R$)">
                  <input type="number" value={form.quota_parte} onChange={set('quota_parte')}
                    placeholder="0.00" min="0" step="0.01" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#635BFF')}
                    onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
                  />
                </InputGroup>
              </div>

              {['suspenso', 'demitido', 'excluido'].includes(form.status) && (
                <InputGroup label="Motivo de saída / suspensão">
                  <textarea value={form.motivo_saida} onChange={set('motivo_saida')}
                    placeholder="Descreva o motivo…" rows={3}
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
          <button type="button"
            onClick={() => abaIdx > 0 && setAbaAtiva(ABAS[abaIdx - 1].id)}
            disabled={abaIdx === 0}
            style={{
              padding: '9px 18px', border: '1px solid #d5d3cc', borderRadius: '8px',
              background: '#fff', fontSize: '13px', color: '#555',
              cursor: abaIdx === 0 ? 'not-allowed' : 'pointer', opacity: abaIdx === 0 ? 0.4 : 1,
            }}
          >
            ← Anterior
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button"
              onClick={() => router.push(`/cooperados/${id}`)}
              style={{
                padding: '9px 18px', border: '1px solid #d5d3cc', borderRadius: '8px',
                background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            {abaIdx < ABAS.length - 1 ? (
              <button type="button"
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
              <button type="submit" disabled={salvando}
                style={{
                  padding: '9px 24px', border: 'none', borderRadius: '8px',
                  background: salvando ? '#9F9BFF' : '#635BFF', color: '#fff',
                  fontSize: '13px', fontWeight: '600',
                  cursor: salvando ? 'not-allowed' : 'pointer',
                }}
              >
                {salvando ? 'Salvando…' : '✓ Salvar alterações'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
