'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TipoAssembleia } from '@/types/database'

// ─── Helpers visuais ─────────────────────────────────────────────────────────

function InputGroup({ label, children, required, dica }: {
  label: string; children: React.ReactNode; required?: boolean; dica?: string
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
      {dica && <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{dica}</p>}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#635BFF')
const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#d5d3cc')

// ─── Dados de configuração ───────────────────────────────────────────────────

const TIPOS: { valor: TipoAssembleia; sigla: string; label: string; cor: string; bg: string }[] = [
  { valor: 'AGO',        sigla: 'AGO', label: 'Assembleia Geral Ordinária',           cor: '#185FA5', bg: '#E6F1FB' },
  { valor: 'AGE',        sigla: 'AGE', label: 'Assembleia Geral Extraordinária',      cor: '#6366f1', bg: '#ede9fe' },
  { valor: 'reuniao_CA', sigla: 'CA',  label: 'Reunião do Conselho de Administração', cor: '#4840CC', bg: '#EEF0FF' },
  { valor: 'reuniao_CF', sigla: 'CF',  label: 'Reunião do Conselho Fiscal',           cor: '#854F0B', bg: '#FAEEDA' },
]

// ─── Formulário ──────────────────────────────────────────────────────────────

interface FormData {
  tipo: TipoAssembleia
  titulo: string
  modalidade: 'presencial' | 'remota' | 'hibrida'
  data_realizacao: string
  data_convocacao: string
  local: string
  edital_url: string
  quorum_minimo: string
  pauta: string
  observacoes: string
}

const INICIAL: FormData = {
  tipo: 'AGO',
  titulo: '',
  modalidade: 'presencial',
  data_realizacao: '',
  data_convocacao: '',
  local: '',
  edital_url: '',
  quorum_minimo: '',
  pauta: '',
  observacoes: '',
}

export default function NovaAssembleiaPage() {
  const router = useRouter()
  const [form, setForm]     = useState<FormData>(INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]     = useState('')

  const set = (campo: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [campo]: e.target.value }))

  const tipoAtual = TIPOS.find(t => t.valor === form.tipo)!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim())       { setErro('Título é obrigatório.'); return }
    if (!form.data_realizacao)     { setErro('Data de realização é obrigatória.'); return }

    setSalvando(true)
    setErro('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: usuario } = await supabase
      .from('usuarios').select('organizacao_id').eq('id', user.id).single()

    if (!usuario?.organizacao_id) {
      setErro('Usuário sem organização vinculada.')
      setSalvando(false)
      return
    }

    const payload = {
      organizacao_id:    usuario.organizacao_id,
      tipo:              form.tipo,
      titulo:            form.titulo.trim(),
      modalidade:        form.modalidade,
      data_realizacao:   form.data_realizacao,
      data_convocacao:   form.data_convocacao  || null,
      local:             form.local.trim()     || null,
      edital_url:        form.edital_url.trim()|| null,
      quorum_minimo:     form.quorum_minimo ? parseInt(form.quorum_minimo, 10) : null,
      pauta:             form.pauta.trim()     || null,
      observacoes:       form.observacoes.trim()|| null,
      status:            'agendada' as const,
      convocacao_enviada: false,
      total_presentes:   0,
      quorum_atingido:   false,
      ata_gerada:        false,
      ata_assinada:      false,
      usuario_id:        user.id,
    }

    const { data, error } = await supabase
      .from('assembleias').insert(payload).select().single()

    if (error) {
      setErro(`Erro ao salvar: ${error.message}`)
      setSalvando(false)
      return
    }

    router.push(`/assembleias/${data.id}`)
  }

  return (
    <div style={{ maxWidth: '720px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/assembleias')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '4px' }}>
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Nova assembleia</h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>Registre uma assembleia ou reunião de conselho</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── Seção 1: Tipo ───────────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
              Tipo de reunião
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {TIPOS.map(t => (
                <button
                  key={t.valor} type="button" onClick={() => setForm(prev => ({ ...prev, tipo: t.valor }))}
                  style={{
                    padding: '12px 14px', border: `1.5px solid ${form.tipo === t.valor ? t.cor : '#d5d3cc'}`,
                    borderRadius: '10px', background: form.tipo === t.valor ? t.bg : '#fafaf8',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '700', color: form.tipo === t.valor ? t.cor : '#555' }}>
                    {t.sigla}
                  </div>
                  <div style={{ fontSize: '11px', color: form.tipo === t.valor ? t.cor : '#888', marginTop: '2px', lineHeight: 1.3 }}>
                    {t.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Seção 2: Identificação ──────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Identificação
            </p>

            <InputGroup label="Título" required>
              <input type="text" value={form.titulo} onChange={set('titulo')}
                placeholder={`Ex.: ${tipoAtual.label} 2026`}
                required style={inp} onFocus={fo} onBlur={bl}
              />
            </InputGroup>

            <InputGroup label="Modalidade">
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['presencial', 'remota', 'hibrida'] as const).map(m => (
                  <label key={m} style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '9px 12px', border: `1px solid ${form.modalidade === m ? '#635BFF' : '#d5d3cc'}`,
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                    background: form.modalidade === m ? '#EEF0FF' : '#fafaf8',
                    color: form.modalidade === m ? '#4840CC' : '#555',
                    fontWeight: form.modalidade === m ? '600' : '400',
                  }}>
                    <input type="radio" name="modalidade" value={m}
                      checked={form.modalidade === m}
                      onChange={set('modalidade')}
                      style={{ accentColor: '#635BFF' }}
                    />
                    {m === 'presencial' ? 'Presencial' : m === 'remota' ? 'Remota' : 'Híbrida'}
                  </label>
                ))}
              </div>
            </InputGroup>
          </div>

          {/* ── Seção 3: Data e Local ────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Data e Local
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputGroup label="Data de realização" required>
                <input type="date" value={form.data_realizacao} onChange={set('data_realizacao')}
                  required style={inp} onFocus={fo} onBlur={bl}
                />
              </InputGroup>
              <InputGroup label="Data de convocação"
                dica="Data em que a convocação foi ou será enviada">
                <input type="date" value={form.data_convocacao} onChange={set('data_convocacao')}
                  style={inp} onFocus={fo} onBlur={bl}
                />
              </InputGroup>
            </div>

            <InputGroup label="Local / link de acesso">
              <input type="text" value={form.local} onChange={set('local')}
                placeholder="Sede da cooperativa / https://meet.google.com/…"
                style={inp} onFocus={fo} onBlur={bl}
              />
            </InputGroup>

            <InputGroup label="URL do edital de convocação">
              <input type="url" value={form.edital_url} onChange={set('edital_url')}
                placeholder="https://…" style={inp} onFocus={fo} onBlur={bl}
              />
            </InputGroup>
          </div>

          {/* ── Seção 4: Pauta e Quórum ─────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Pauta e Quórum
            </p>

            <InputGroup label="Quórum mínimo" dica="Número mínimo de filiados para validade da assembleia">
              <input type="number" value={form.quorum_minimo} onChange={set('quorum_minimo')}
                placeholder="Ex.: 30" min="1"
                style={{ ...inp, maxWidth: '160px' }} onFocus={fo} onBlur={bl}
              />
            </InputGroup>

            <InputGroup label="Pauta"
              dica="Descreva os pontos de pauta, um por linha">
              <textarea value={form.pauta} onChange={set('pauta')}
                placeholder={`1. Leitura e aprovação da ata anterior\n2. Apresentação do relatório financeiro\n3. Eleição da diretoria\n4. Assuntos gerais`}
                rows={6}
                style={{ ...inp, resize: 'vertical', minHeight: '130px', lineHeight: '1.6' }}
                onFocus={fo} onBlur={bl}
              />
            </InputGroup>

            <InputGroup label="Observações">
              <textarea value={form.observacoes} onChange={set('observacoes')}
                placeholder="Informações adicionais sobre a assembleia…"
                rows={3}
                style={{ ...inp, resize: 'vertical', minHeight: '80px' }}
                onFocus={fo} onBlur={bl}
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
            <button type="button" onClick={() => router.push('/assembleias')}
              style={{ padding: '9px 20px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              style={{
                padding: '9px 24px', border: 'none', borderRadius: '8px',
                background: salvando ? '#9F9BFF' : tipoAtual.cor,
                color: '#fff', fontSize: '13px', fontWeight: '600',
                cursor: salvando ? 'not-allowed' : 'pointer',
              }}>
              {salvando ? 'Salvando…' : `✓ Registrar ${tipoAtual.sigla}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
