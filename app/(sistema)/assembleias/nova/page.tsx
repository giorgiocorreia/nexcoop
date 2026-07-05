'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { traduzirErro } from '@/lib/utils/erros'
import type { TipoAssembleia } from '@/types/database'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Field, Input, Select, Textarea,
  AlertBanner, MODULO_NEXCOOP, COM_C,
} from '@/components/nexcoop/ui'

const TIPOS: { valor: TipoAssembleia; sigla: string; label: string; cor: string; bg: string }[] = [
  { valor: 'AGO',        sigla: 'AGO', label: 'Assembleia Geral Ordinária',           cor: '#185FA5', bg: '#E6F1FB' },
  { valor: 'AGE',        sigla: 'AGE', label: 'Assembleia Geral Extraordinária',      cor: '#6366f1', bg: '#ede9fe' },
  { valor: 'reuniao_CA', sigla: 'CA',  label: 'Reunião do Conselho de Administração', cor: '#4840CC', bg: '#EEF0FF' },
  { valor: 'reuniao_CF', sigla: 'CF',  label: 'Reunião do Conselho Fiscal',           cor: '#854F0B', bg: '#FAEEDA' },
]

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
      setErro(traduzirErro(error.message))
      setSalvando(false)
      return
    }

    router.push(`/assembleias/${data.id}`)
  }

  return (
    <PageLayout
      titulo="Nova Assembleia"
      icone="ti-users-group"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Assembleias', href: '/assembleias' },
        { label: 'Nova' },
      ]}
      fullHeight
    >
      <div style={{ maxWidth: 720 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <ContentCard title="Tipo de reunião">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {TIPOS.map(t => (
                  <button
                    key={t.valor} type="button" onClick={() => setForm(prev => ({ ...prev, tipo: t.valor }))}
                    style={{
                      padding: '12px 14px', border: `1.5px solid ${form.tipo === t.valor ? t.cor : COM_C.borda}`,
                      borderRadius: 10, background: form.tipo === t.valor ? t.bg : '#fafaf8',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.tipo === t.valor ? t.cor : COM_C.txtSub }}>
                      {t.sigla}
                    </div>
                    <div style={{ fontSize: 11, color: form.tipo === t.valor ? t.cor : '#A8A29E', marginTop: 2, lineHeight: 1.3 }}>
                      {t.label}
                    </div>
                  </button>
                ))}
              </div>
            </ContentCard>

            <ContentCard title="Identificação">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Título *">
                  <Input type="text" value={form.titulo} onChange={set('titulo')}
                    placeholder={`Ex.: ${tipoAtual.label} 2026`} required
                  />
                </Field>

                <Field label="Modalidade">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['presencial', 'remota', 'hibrida'] as const).map(m => (
                      <label key={m} style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 7,
                        padding: '9px 12px', border: `1px solid ${form.modalidade === m ? COM_C.roxo : COM_C.borda}`,
                        borderRadius: 8, cursor: 'pointer', fontSize: 13,
                        background: form.modalidade === m ? COM_C.roxoLt : '#fafaf8',
                        color: form.modalidade === m ? COM_C.roxo : COM_C.txtSub,
                        fontWeight: form.modalidade === m ? 600 : 400,
                      }}>
                        <input type="radio" name="modalidade" value={m}
                          checked={form.modalidade === m}
                          onChange={set('modalidade')}
                          style={{ accentColor: COM_C.roxo }}
                        />
                        {m === 'presencial' ? 'Presencial' : m === 'remota' ? 'Remota' : 'Híbrida'}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </ContentCard>

            <ContentCard title="Data e Local">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Data de realização *">
                    <Input type="date" value={form.data_realizacao} onChange={set('data_realizacao')} required />
                  </Field>
                  <Field label="Data de convocação" hint="Data em que a convocação foi ou será enviada">
                    <Input type="date" value={form.data_convocacao} onChange={set('data_convocacao')} />
                  </Field>
                </div>

                <Field label="Local / link de acesso">
                  <Input type="text" value={form.local} onChange={set('local')}
                    placeholder="Sede da cooperativa / https://meet.google.com/…"
                  />
                </Field>

                <Field label="URL do edital de convocação">
                  <Input type="url" value={form.edital_url} onChange={set('edital_url')} placeholder="https://…" />
                </Field>
              </div>
            </ContentCard>

            <ContentCard title="Pauta e Quórum">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Quórum mínimo" hint="Número mínimo de filiados para validade da assembleia">
                  <Input type="number" value={form.quorum_minimo} onChange={set('quorum_minimo')}
                    placeholder="Ex.: 30" min="1" style={{ maxWidth: 160 }}
                  />
                </Field>

                <Field label="Pauta" hint="Descreva os pontos de pauta, um por linha">
                  <Textarea value={form.pauta} onChange={set('pauta')}
                    placeholder={`1. Leitura e aprovação da ata anterior\n2. Apresentação do relatório financeiro\n3. Eleição da diretoria\n4. Assuntos gerais`}
                    rows={6} style={{ minHeight: 130, lineHeight: 1.6 }}
                  />
                </Field>

                <Field label="Observações">
                  <Textarea value={form.observacoes} onChange={set('observacoes')}
                    placeholder="Informações adicionais sobre a assembleia…"
                    rows={3} style={{ minHeight: 80 }}
                  />
                </Field>
              </div>
            </ContentCard>

            {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 32 }}>
              <Btn variante="cinza" onClick={() => router.push('/assembleias')}>Cancelar</Btn>
              <Btn type="submit" variante="roxo" icone="ti-check" disabled={salvando}>
                {salvando ? 'Salvando…' : `Registrar ${tipoAtual.sigla}`}
              </Btn>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}