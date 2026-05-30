'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
import type { TipoLancamento, StatusLancamento } from '@/types/database'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InputGroup({ label, children, required }: {
  label: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '12px', fontWeight: '600', color: '#555',
        marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px',
      }}>
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

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#635BFF')
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#d5d3cc')

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
    <div style={{ maxWidth: '680px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/financeiro')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '4px' }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
            Novo lançamento
          </h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>Registre uma receita, despesa ou transferência</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── Tipo ─────────────────────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>
              Tipo de lançamento
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(Object.entries(TIPO_CONFIG) as [TipoLancamento, typeof TIPO_CONFIG[TipoLancamento]][]).map(([t, cfg]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  style={{
                    padding: '12px 10px', border: `1.5px solid ${form.tipo === t ? cfg.cor : '#d5d3cc'}`,
                    borderRadius: '10px', background: form.tipo === t ? cfg.bg : '#fafaf8',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '4px', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '22px', fontWeight: '700', color: cfg.cor }}>{cfg.icone}</span>
                  <span style={{ fontSize: '12px', fontWeight: form.tipo === t ? '700' : '400', color: form.tipo === t ? cfg.cor : '#555' }}>
                    {cfg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Dados principais ──────────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Dados principais
            </p>

            <InputGroup label="Descrição" required>
              <input
                type="text" value={form.descricao} onChange={set('descricao')}
                placeholder="Ex.: Anuidade cooperado, Compra de insumos…"
                required style={inputStyle} onFocus={onFocus} onBlur={onBlur}
              />
            </InputGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputGroup label="Valor (R$)" required>
                <input
                  type="number" value={form.valor} onChange={set('valor')}
                  placeholder="0,00" min="0.01" step="0.01" required
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </InputGroup>
              <InputGroup label="Status" required>
                <select value={form.status} onChange={set('status')} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago / Recebido</option>
                  <option value="agendado">Agendado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </InputGroup>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputGroup label="Data de competência" required>
                <input
                  type="date" value={form.data_competencia} onChange={set('data_competencia')}
                  required style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </InputGroup>
              <InputGroup label="Data de vencimento">
                <input
                  type="date" value={form.data_vencimento} onChange={set('data_vencimento')}
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </InputGroup>
            </div>

            {/* Data de pagamento — só aparece se status = pago */}
            {form.status === 'pago' && (
              <InputGroup label="Data de pagamento / recebimento">
                <input
                  type="date" value={form.data_pagamento} onChange={set('data_pagamento')}
                  style={{ ...inputStyle, maxWidth: '220px' }} onFocus={onFocus} onBlur={onBlur}
                />
              </InputGroup>
            )}
          </div>

          {/* ── Vinculações ───────────────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Vinculações (opcional)
            </p>

            <InputGroup label="Cooperado vinculado">
              <select value={form.cooperado_id} onChange={set('cooperado_id')} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">Nenhum cooperado</option>
                {cooperados.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_completo}</option>
                ))}
              </select>
            </InputGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputGroup label="Número do documento">
                <input
                  type="text" value={form.numero_documento} onChange={set('numero_documento')}
                  placeholder="NF, recibo, boleto…" style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </InputGroup>
              <InputGroup label="Centro de custo">
                <input
                  type="text" value={form.centro_custo} onChange={set('centro_custo')}
                  placeholder="Ex.: Administrativo" style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </InputGroup>
            </div>

            {/* Conta destino apenas para transferência */}
            {form.tipo === 'transferencia' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InputGroup label="Conta de origem">
                  <input
                    type="text" value={form.conta_id} onChange={set('conta_id')}
                    placeholder="Nome ou ID da conta" style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                </InputGroup>
                <InputGroup label="Conta de destino">
                  <input
                    type="text" value={form.conta_destino_id} onChange={set('conta_destino_id')}
                    placeholder="Nome ou ID da conta" style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                </InputGroup>
              </div>
            )}

            <InputGroup label="URL do comprovante">
              <input
                type="url" value={form.comprovante_url} onChange={set('comprovante_url')}
                placeholder="https://…" style={inputStyle} onFocus={onFocus} onBlur={onBlur}
              />
            </InputGroup>
          </div>

          {/* ── Recorrência ───────────────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Recorrência (opcional)
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#333' }}>
              <input
                type="checkbox"
                checked={form.recorrente}
                onChange={e => setForm(prev => ({ ...prev, recorrente: e.target.checked, frequencia: '' }))}
                style={{ accentColor: '#635BFF', width: '16px', height: '16px' }}
              />
              Este lançamento se repete periodicamente
            </label>
            {form.recorrente && (
              <InputGroup label="Frequência">
                <select value={form.frequencia} onChange={set('frequencia')} style={{ ...inputStyle, maxWidth: '200px' }} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Selecione</option>
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="anual">Anual</option>
                </select>
              </InputGroup>
            )}
          </div>

          {/* ── Observações ───────────────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
            <InputGroup label="Observações">
              <textarea
                value={form.observacoes} onChange={set('observacoes')}
                placeholder="Anotações sobre este lançamento…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                onFocus={onFocus} onBlur={onBlur}
              />
            </InputGroup>
          </div>

          {/* Erro */}
          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>
              ⚠ {erro}
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
            <button
              type="button"
              onClick={() => router.push('/financeiro')}
              style={{ padding: '9px 20px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              style={{
                padding: '9px 24px', border: 'none', borderRadius: '8px',
                background: salvando ? '#9F9BFF' : tipo.cor,
                color: '#fff', fontSize: '13px', fontWeight: '600',
                cursor: salvando ? 'not-allowed' : 'pointer',
              }}
            >
              {salvando ? 'Salvando…' : `✓ Registrar ${tipo.label.toLowerCase()}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
