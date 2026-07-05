'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
import type { TipoLancamento, StatusLancamento } from '@/types/database'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Field, Input, Select, Textarea,
  AlertBanner, MODULO_NEXCOOP, COM_C,
} from '@/components/nexcoop/ui'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface FormData {
  tipo: TipoLancamento
  descricao: string
  valor: string
  data_competencia: string
  data_vencimento: string
  data_pagamento: string
  status: StatusLancamento
  numero_documento: string
  cooperado_id: string
  conta_id: string
  conta_destino_id: string
  centro_custo: string
  recorrente: boolean
  frequencia: 'mensal' | 'trimestral' | 'anual' | ''
  observacoes: string
  comprovante_url: string
}

const FORM_INICIAL: FormData = {
  tipo: 'receita',
  descricao: '',
  valor: '',
  data_competencia: new Date().toISOString().split('T')[0],
  data_vencimento: '',
  data_pagamento: '',
  status: 'pendente',
  numero_documento: '',
  cooperado_id: '',
  conta_id: '',
  conta_destino_id: '',
  centro_custo: '',
  recorrente: false,
  frequencia: '',
  observacoes: '',
  comprovante_url: '',
}

const TIPO_CONFIG = {
  receita:      { label: 'Receita',      icone: '↑', cor: '#4840CC', bg: '#EEF0FF' },
  despesa:      { label: 'Despesa',      icone: '↓', cor: '#993C1D', bg: '#FAECE7' },
  transferencia:{ label: 'Transferência',icone: '↔', cor: '#185FA5', bg: '#E6F1FB' },
} as const

const BTN_VARIANTE: Record<TipoLancamento, 'roxo' | 'marrom' | 'azul'> = {
  receita: 'roxo',
  despesa: 'marrom',
  transferencia: 'azul',
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function NovoLancamentoPage() {
  const router = useRouter()
  const [form, setForm]         = useState<FormData>(FORM_INICIAL)
  const [cooperados, setCooperados] = useState<{ id: string; nome_completo: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  // Carrega cooperados para o select
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('cooperados')
      .select('id, nome_completo')
      .in('status', ['ativo', 'probatorio'])
      .order('nome_completo')
      .then(({ data }) => {
        if (data) setCooperados(data as { id: string; nome_completo: string }[])
      })
  }, [])

  const set = (campo: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [campo]: e.target.value }))

  const setTipo = (tipo: TipoLancamento) => {
    setForm(prev => ({
      ...prev,
      tipo,
      // Ao mudar para pago, status também muda
      status: tipo === 'transferencia' ? 'pago' : prev.status,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.descricao.trim()) { setErro('Descrição é obrigatória.'); return }
    if (!form.valor || Number(form.valor) <= 0) { setErro('Valor deve ser maior que zero.'); return }
    if (!form.data_competencia) { setErro('Data de competência é obrigatória.'); return }

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

    const payload = {
      organizacao_id:  usuario.organizacao_id,
      tipo:            form.tipo,
      status:          form.status,
      descricao:       form.descricao.trim(),
      valor:           parseFloat(form.valor.replace(',', '.')),
      data_competencia: form.data_competencia,
      data_vencimento: form.data_vencimento || null,
      data_pagamento:  form.data_pagamento || null,
      numero_documento: form.numero_documento.trim() || null,
      cooperado_id:    form.cooperado_id || null,
      conta_id:        form.conta_id.trim() || null,
      conta_destino_id: form.tipo === 'transferencia' ? (form.conta_destino_id.trim() || null) : null,
      centro_custo:    form.centro_custo.trim() || null,
      recorrente:      form.recorrente,
      frequencia:      form.recorrente ? (form.frequencia as 'mensal' | 'trimestral' | 'anual') || null : null,
      observacoes:     form.observacoes.trim() || null,
      comprovante_url: form.comprovante_url.trim() || null,
      usuario_id:      user.id,
    }

    const { data, error } = await supabase
      .from('lancamentos')
      .insert(payload)
      .select()
      .single()

    if (error) {
      setErro(traduzirErro(error.message))
      setSalvando(false)
      return
    }

    router.push(`/financeiro/${data.id}`)
  }

  const tipo = TIPO_CONFIG[form.tipo]

  return (
    <PageLayout
      titulo="Novo Lançamento"
      icone="ti-receipt-2"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Financeiro', href: '/financeiro' },
        { label: 'Novo' },
      ]}
      fullHeight
    >
      <div style={{ maxWidth: 720 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Tipo ─────────────────────────────────────────────────────────── */}
            <ContentCard title="Tipo de lançamento">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(Object.entries(TIPO_CONFIG) as [TipoLancamento, typeof TIPO_CONFIG[TipoLancamento]][]).map(([t, cfg]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    style={{
                      padding: '12px 10px', border: `1.5px solid ${form.tipo === t ? cfg.cor : COM_C.borda}`,
                      borderRadius: 10, background: form.tipo === t ? cfg.bg : '#FAFAF9',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4, transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 22, fontWeight: 700, color: cfg.cor }}>{cfg.icone}</span>
                    <span style={{ fontSize: 12, fontWeight: form.tipo === t ? 700 : 400, color: form.tipo === t ? cfg.cor : COM_C.txtSub }}>
                      {cfg.label}
                    </span>
                  </button>
                ))}
              </div>
            </ContentCard>

            {/* ── Dados principais ──────────────────────────────────────────────── */}
            <ContentCard title="Dados principais">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Descrição *">
                  <Input
                    type="text" value={form.descricao} onChange={set('descricao')}
                    placeholder="Ex.: Anuidade cooperado, Compra de insumos…"
                    required
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Valor (R$) *">
                    <Input
                      type="number" value={form.valor} onChange={set('valor')}
                      placeholder="0,00" min="0.01" step="0.01" required
                    />
                  </Field>
                  <Field label="Status *">
                    <Select value={form.status} onChange={set('status')}>
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago / Recebido</option>
                      <option value="agendado">Agendado</option>
                      <option value="cancelado">Cancelado</option>
                    </Select>
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Data de competência *">
                    <Input
                      type="date" value={form.data_competencia} onChange={set('data_competencia')}
                      required
                    />
                  </Field>
                  <Field label="Data de vencimento">
                    <Input
                      type="date" value={form.data_vencimento} onChange={set('data_vencimento')}
                    />
                  </Field>
                </div>

                {form.status === 'pago' && (
                  <Field label="Data de pagamento / recebimento">
                    <Input
                      type="date" value={form.data_pagamento} onChange={set('data_pagamento')}
                      style={{ maxWidth: 220 }}
                    />
                  </Field>
                )}
              </div>
            </ContentCard>

            {/* ── Vinculações ───────────────────────────────────────────────────── */}
            <ContentCard title="Vinculações (opcional)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Cooperado vinculado">
                  <Select value={form.cooperado_id} onChange={set('cooperado_id')}>
                    <option value="">Nenhum cooperado</option>
                    {cooperados.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_completo}</option>
                    ))}
                  </Select>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Número do documento">
                    <Input
                      type="text" value={form.numero_documento} onChange={set('numero_documento')}
                      placeholder="NF, recibo, boleto…"
                    />
                  </Field>
                  <Field label="Centro de custo">
                    <Input
                      type="text" value={form.centro_custo} onChange={set('centro_custo')}
                      placeholder="Ex.: Administrativo"
                    />
                  </Field>
                </div>

                {form.tipo === 'transferencia' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Conta de origem">
                      <Input
                        type="text" value={form.conta_id} onChange={set('conta_id')}
                        placeholder="Nome ou ID da conta"
                      />
                    </Field>
                    <Field label="Conta de destino">
                      <Input
                        type="text" value={form.conta_destino_id} onChange={set('conta_destino_id')}
                        placeholder="Nome ou ID da conta"
                      />
                    </Field>
                  </div>
                )}

                <Field label="URL do comprovante">
                  <Input
                    type="url" value={form.comprovante_url} onChange={set('comprovante_url')}
                    placeholder="https://…"
                  />
                </Field>
              </div>
            </ContentCard>

            {/* ── Recorrência ───────────────────────────────────────────────────── */}
            <ContentCard title="Recorrência (opcional)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: COM_C.txt }}>
                  <input
                    type="checkbox"
                    checked={form.recorrente}
                    onChange={e => setForm(prev => ({ ...prev, recorrente: e.target.checked, frequencia: '' }))}
                    style={{ accentColor: COM_C.roxo, width: 16, height: 16 }}
                  />
                  Este lançamento se repete periodicamente
                </label>
                {form.recorrente && (
                  <Field label="Frequência">
                    <Select value={form.frequencia} onChange={set('frequencia')} style={{ maxWidth: 200 }}>
                      <option value="">Selecione</option>
                      <option value="mensal">Mensal</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="anual">Anual</option>
                    </Select>
                  </Field>
                )}
              </div>
            </ContentCard>

            {/* ── Observações ───────────────────────────────────────────────────── */}
            <ContentCard title="Observações">
              <Field label="Observações">
                <Textarea
                  value={form.observacoes} onChange={set('observacoes')}
                  placeholder="Anotações sobre este lançamento…"
                  rows={3}
                />
              </Field>
            </ContentCard>

            {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: '2rem' }}>
              <Btn type="button" variante="cinza" onClick={() => router.push('/financeiro')}>
                Cancelar
              </Btn>
              <Btn
                type="submit"
                variante={BTN_VARIANTE[form.tipo]}
                icone="ti-check"
                disabled={salvando}
              >
                {salvando ? 'Salvando…' : `Registrar ${tipo.label.toLowerCase()}`}
              </Btn>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}