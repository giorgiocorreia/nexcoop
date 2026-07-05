'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
import { cpfInvalidoMsg } from '@/lib/utils/cpf'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Field, Input, Select, Textarea,
  Tabs, AlertBanner, MODULO_NEXCOOP, COM_C,
} from '@/components/nexcoop/ui'
import type { StatusCooperado } from '@/types/database'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const CAF_SITUACOES = ['ativo', 'vencido', 'em_renovacao', 'cancelado']

type Aba = 'pessoal' | 'contato' | 'propriedade' | 'cadastro'

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: 'pessoal',     label: 'Dados pessoais',     icon: 'ti-user' },
  { id: 'contato',     label: 'Contato / Endereço', icon: 'ti-map-pin' },
  { id: 'propriedade', label: 'Propriedade rural',  icon: 'ti-plant-2' },
  { id: 'cadastro',    label: 'Cadastro',            icon: 'ti-clipboard-list' },
]

function lbl(text: string, required?: boolean) {
  return required ? `${text} *` : text
}

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
  conjuge_nome: string
  conjuge_cpf: string
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
  const [erroConjugeCpf, setErroConjugeCpf] = useState('')

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
          conjuge_nome:       data.conjuge_nome ?? '',
          conjuge_cpf:        data.conjuge_cpf ?? '',
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
    if (form.tipo === 'pessoa_fisica' && form.cpf) {
      const erroCpf = cpfInvalidoMsg(form.cpf)
      if (erroCpf) { setErro(erroCpf); setAbaAtiva('pessoal'); return }
    }
    if (form.tipo === 'pessoa_juridica' && form.representante_cpf) {
      const erroCpf = cpfInvalidoMsg(form.representante_cpf)
      if (erroCpf) { setErro(erroCpf); setAbaAtiva('pessoal'); return }
    }
    if (form.conjuge_cpf) {
      const erroCpfConjuge = cpfInvalidoMsg(form.conjuge_cpf)
      if (erroCpfConjuge) { setErroConjugeCpf(erroCpfConjuge); setAbaAtiva('pessoal'); return }
    }
    setSalvando(true)
    setErro('')
    setErroConjugeCpf('')

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
      conjuge_nome:       form.conjuge_nome.trim() || null,
      conjuge_cpf:        form.conjuge_cpf.replace(/\D/g, '') || null,
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
      <PageLayout titulo="Editar Filiado" icone="ti-user-edit" modulo={MODULO_NEXCOOP}
        breadcrumb={[{ label: 'Cooperados', href: '/cooperados' }, { label: 'Editar' }]}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: COM_C.txtSub, fontSize: 14 }}>
          <i className="ti ti-loader" style={{ marginRight: 8 }} /> Carregando...
        </div>
      </PageLayout>
    )
  }

  if (!form) {
    return (
      <PageLayout titulo="Editar Filiado" icone="ti-user-edit" modulo={MODULO_NEXCOOP}
        breadcrumb={[{ label: 'Cooperados', href: '/cooperados' }, { label: 'Editar' }]}>
        <AlertBanner tipo="erro">{erro || 'Filiado não encontrado.'}</AlertBanner>
      </PageLayout>
    )
  }

  const abaIdx = ABAS.findIndex(a => a.id === abaAtiva)

  return (
    <PageLayout
      titulo="Editar Filiado"
      icone="ti-user-edit"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Cooperados', href: '/cooperados' },
        { label: 'Perfil', href: `/cooperados/${id}` },
        { label: 'Editar' },
      ]}
    >
      <div style={{ maxWidth: 760 }}>

      <Tabs
        tabs={ABAS.map((aba, i) => ({ id: aba.id, label: `${i + 1}. ${aba.label}`, icon: aba.icon }))}
        ativa={abaAtiva}
        onChange={id => setAbaAtiva(id as Aba)}
      />

      <form onSubmit={handleSubmit}>
        <ContentCard padding="1.75rem">

          {abaAtiva === 'pessoal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field label={lbl('Tipo de pessoa', true)}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { val: 'pessoa_fisica', label: 'Pessoa Física', icon: 'ti-user' },
                    { val: 'pessoa_juridica', label: 'Pessoa Jurídica', icon: 'ti-building' },
                  ].map(op => (
                    <label key={op.val} style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', border: `1px solid ${form.tipo === op.val ? COM_C.roxo : COM_C.borda}`,
                      borderRadius: 8, cursor: 'pointer', fontSize: 13,
                      background: form.tipo === op.val ? COM_C.roxoLt : '#fff',
                      color: form.tipo === op.val ? COM_C.roxo : COM_C.txtSub,
                      fontWeight: form.tipo === op.val ? 600 : 400,
                    }}>
                      <input type="radio" name="tipo" value={op.val}
                        checked={form.tipo === op.val} onChange={set('tipo')}
                        style={{ accentColor: COM_C.roxo }}
                      />
                      <i className={`ti ${op.icon}`} style={{ fontSize: 14 }} />
                      {op.label}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label={lbl('Nome completo', true)}>
                <Input type="text" value={form.nome_completo} onChange={set('nome_completo')}
                  placeholder={form.tipo === 'pessoa_fisica' ? 'João da Silva' : 'Razão social'} required
                />
              </Field>

              {form.tipo === 'pessoa_fisica' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="CPF">
                      <Input type="text" value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" maxLength={14} />
                    </Field>
                    <Field label="RG">
                      <Input type="text" value={form.rg} onChange={set('rg')} placeholder="0000000" />
                    </Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Data de nascimento">
                      <Input type="date" value={form.data_nascimento} onChange={set('data_nascimento')} />
                    </Field>
                    <Field label="Sexo">
                      <Select value={form.sexo} onChange={set('sexo')}>
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="outro">Outro</option>
                      </Select>
                    </Field>
                  </div>

                  <hr style={{ border: 'none', borderTop: `1px solid ${COM_C.borda}`, margin: '0.25rem 0' }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: COM_C.txtSub, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cônjuge</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Nome do cônjuge" hint="Opcional — usado para emitir NF-e em nome do cônjuge quando a CAF/DAP é conjunta">
                      <Input type="text" value={form.conjuge_nome} onChange={set('conjuge_nome')} placeholder="Nome completo do cônjuge" />
                    </Field>
                    <Field label="CPF do cônjuge">
                      <Input type="text" value={form.conjuge_cpf}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                          const masked = digits
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                          setForm(prev => prev ? { ...prev, conjuge_cpf: masked } : prev)
                          setErroConjugeCpf('')
                        }}
                        onBlur={() => {
                          if (form.conjuge_cpf) setErroConjugeCpf(cpfInvalidoMsg(form.conjuge_cpf) ?? '')
                          else setErroConjugeCpf('')
                        }}
                        placeholder="000.000.000-00" maxLength={14}
                        style={erroConjugeCpf ? { borderColor: COM_C.vermelho } : undefined}
                      />
                      {erroConjugeCpf && <span style={{ fontSize: 11, color: COM_C.vermelho }}>{erroConjugeCpf}</span>}
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  <Field label="CNPJ">
                    <Input type="text" value={form.cnpj_pj} onChange={set('cnpj_pj')} placeholder="00.000.000/0001-00" />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Nome do representante">
                      <Input type="text" value={form.representante_nome} onChange={set('representante_nome')} placeholder="Nome completo" />
                    </Field>
                    <Field label="CPF do representante">
                      <Input type="text" value={form.representante_cpf} onChange={set('representante_cpf')} placeholder="000.000.000-00" maxLength={14} />
                    </Field>
                  </div>
                </>
              )}
            </div>
          )}

          {abaAtiva === 'contato' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="E-mail">
                  <Input type="email" value={form.email} onChange={set('email')} placeholder="nome@email.com" />
                </Field>
                <Field label="Telefone">
                  <Input type="tel" value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
                </Field>
                <Field label="WhatsApp">
                  <Input type="tel" value={form.whatsapp} onChange={set('whatsapp')} placeholder="(00) 00000-0000" />
                </Field>
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid ${COM_C.borda}`, margin: '0.5rem 0' }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: COM_C.txtSub, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endereço</p>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
                <Field label="CEP">
                  <div style={{ position: 'relative' }}>
                    <Input type="text" value={form.cep}
                      onChange={e => {
                        set('cep')(e)
                        if (e.target.value.replace(/\D/g, '').length === 8) buscarCEP(e.target.value)
                      }}
                      onBlur={() => buscarCEP(form.cep)}
                      placeholder="00000-000" maxLength={9}
                      style={{ paddingRight: buscandoCep ? 32 : undefined }}
                    />
                    {buscandoCep && (
                      <i className="ti ti-loader" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: COM_C.roxo }} />
                    )}
                  </div>
                </Field>
                <Field label="Logradouro">
                  <Input type="text" value={form.logradouro} onChange={set('logradouro')} placeholder="Rua, Avenida…" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 12 }}>
                <Field label="Número">
                  <Input type="text" value={form.numero} onChange={set('numero')} placeholder="123" />
                </Field>
                <Field label="Complemento">
                  <Input type="text" value={form.complemento} onChange={set('complemento')} placeholder="Apto, sala…" />
                </Field>
                <Field label="Bairro">
                  <Input type="text" value={form.bairro} onChange={set('bairro')} placeholder="Bairro" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                <Field label="Cidade">
                  <Input type="text" value={form.cidade} onChange={set('cidade')} placeholder="Cidade" />
                </Field>
                <Field label="Estado">
                  <Select value={form.estado} onChange={set('estado')}>
                    <option value="">UF</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {abaAtiva === 'propriedade' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AlertBanner tipo="info">
                Preencha apenas se o membro possuir propriedade rural vinculada. Todos os campos são opcionais.
              </AlertBanner>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
                <Field label="Nome da propriedade">
                  <Input type="text" value={form.nome_propriedade} onChange={set('nome_propriedade')} placeholder="Sítio São João" />
                </Field>
                <Field label="Área total (ha)">
                  <Input type="number" value={form.area_total_ha} onChange={set('area_total_ha')} placeholder="12.5" min="0" step="0.01" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Latitude">
                  <Input type="number" value={form.latitude} onChange={set('latitude')} placeholder="-15.7801" step="any" />
                </Field>
                <Field label="Longitude">
                  <Input type="number" value={form.longitude} onChange={set('longitude')} placeholder="-47.9292" step="any" />
                </Field>
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid ${COM_C.borda}`, margin: '0.25rem 0' }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: COM_C.txtSub, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CAF / DAP</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Número CAF">
                  <Input type="text" value={form.caf_numero} onChange={set('caf_numero')} placeholder="CAF-000000" />
                </Field>
                <Field label="Situação CAF">
                  <Select value={form.caf_situacao} onChange={set('caf_situacao')}>
                    <option value="">Selecione</option>
                    {CAF_SITUACOES.map(s => (
                      <option key={s} value={s}>
                        {s === 'ativo' ? 'Ativo' : s === 'vencido' ? 'Vencido' : s === 'em_renovacao' ? 'Em renovação' : 'Cancelado'}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Validade CAF">
                  <Input type="date" value={form.caf_validade} onChange={set('caf_validade')} />
                </Field>
                <Field label="Número DAP">
                  <Input type="text" value={form.dap_numero} onChange={set('dap_numero')} placeholder="DAP-000000" />
                </Field>
              </div>
            </div>
          )}

          {abaAtiva === 'cadastro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label={lbl('Status', true)}>
                  <Select value={form.status} onChange={set('status')}>
                    <option value="proposta">Proposta</option>
                    <option value="probatorio">Probatório</option>
                    <option value="ativo">Ativo</option>
                    <option value="inadimplente">Inadimplente</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="demitido">Demitido</option>
                    <option value="excluido">Excluído</option>
                  </Select>
                </Field>
                <Field label="Número de matrícula">
                  <Input type="text" value={form.numero_matricula} onChange={set('numero_matricula')} placeholder="001" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Data de admissão">
                  <Input type="date" value={form.data_admissao} onChange={set('data_admissao')} />
                </Field>
                <Field label="Quota-parte (R$)">
                  <Input type="number" value={form.quota_parte} onChange={set('quota_parte')} placeholder="0.00" min="0" step="0.01" />
                </Field>
              </div>

              {['suspenso', 'demitido', 'excluido'].includes(form.status) && (
                <Field label="Motivo de saída / suspensão">
                  <Textarea value={form.motivo_saida} onChange={set('motivo_saida')} placeholder="Descreva o motivo…" rows={3} />
                </Field>
              )}
            </div>
          )}
        </ContentCard>

        {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
          <Btn
            type="button"
            variante="cinza"
            icone="ti-arrow-left"
            onClick={() => abaIdx > 0 && setAbaAtiva(ABAS[abaIdx - 1].id)}
            disabled={abaIdx === 0}
          >
            Anterior
          </Btn>

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn type="button" variante="cinza" onClick={() => router.push(`/cooperados/${id}`)}>
              Cancelar
            </Btn>

            {abaIdx < ABAS.length - 1 ? (
              <Btn type="button" variante="roxo" icone="ti-arrow-right" onClick={() => setAbaAtiva(ABAS[abaIdx + 1].id)}>
                Próximo
              </Btn>
            ) : (
              <Btn type="submit" variante="roxo" icone="ti-check" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </Btn>
            )}
          </div>
        </div>
      </form>
      </div>
    </PageLayout>
  )
}
