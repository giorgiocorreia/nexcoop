'use client'

import { useEffect, useState } from 'react'
import { listarSafras, criarSafra, editarSafra } from '@/lib/comercializacao/safras.actions'
import { Btn } from '@/components/ui/Btn'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'

type Safra = {
  id: string
  ano: number
  descricao: string | null
  estimativa_kg: number | null
  taxa_comercializacao: number
  status: 'planejamento' | 'em_andamento' | 'encerrada'
}

const STATUS_LABEL: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada',
}

const STATUS_CORES: Record<string, { bg: string; cor: string }> = {
  planejamento: { bg: '#F5F5F4', cor: COM_C.txtSub },
  em_andamento: { bg: COM_C.verdeLt, cor: COM_C.verde },
  encerrada: { bg: '#F5F5F4', cor: '#9A9A9A' },
}

const formVazio = {
  ano: new Date().getFullYear(),
  descricao: '',
  estimativa_kg: '',
  taxa_comercializacao: '3',
  status: 'planejamento' as 'planejamento' | 'em_andamento' | 'encerrada',
}

export default function SafrasPage() {
  const [safras, setSafras] = useState<Safra[]>([])
  const [editando, setEditando] = useState<Safra | null>(null)
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await listarSafras()
    setSafras((data ?? []) as unknown as Safra[])
  }

  function abrirEdicao(s: Safra) {
    setEditando(s)
    setForm({
      ano: s.ano,
      descricao: s.descricao ?? '',
      estimativa_kg: s.estimativa_kg?.toString() ?? '',
      taxa_comercializacao: s.taxa_comercializacao.toString(),
      status: s.status,
    })
    setAbrirModal(true)
  }

  function abrirNovo() {
    setEditando(null)
    setForm(formVazio)
    setAbrirModal(true)
  }

  async function handleSalvar() {
    setStatus('salvando')
    try {
      const payload = {
        ano: Number(form.ano),
        descricao: form.descricao || undefined,
        estimativa_kg: form.estimativa_kg ? parseFloat(form.estimativa_kg) : undefined,
        taxa_comercializacao: parseFloat(form.taxa_comercializacao),
        status: form.status,
      }
      if (editando) {
        await editarSafra(editando.id, payload)
      } else {
        await criarSafra(payload)
      }
      setAbrirModal(false)
      setEditando(null)
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  const safraAtiva = safras.find(s => s.status === 'em_andamento')
  const totais = {
    total: safras.length,
    emAndamento: safras.filter(s => s.status === 'em_andamento').length,
    planejamento: safras.filter(s => s.status === 'planejamento').length,
  }

  return (
    <PageLayout
      titulo="Safras"
      subtitulo={
        safraAtiva
          ? `Safra ativa: ${safraAtiva.descricao ?? `Safra ${safraAtiva.ano}`} · Taxa: ${safraAtiva.taxa_comercializacao}%`
          : 'Gerencie as safras de comercialização'
      }
      breadcrumb={[{ label: 'Safras' }]}
      icone="ti-calendar-stats"
      acoes={
        <Btn variante="marrom" icone="ti-plus" onClick={abrirNovo}>
          Nova safra
        </Btn>
      }
    >
      {status === 'sucesso' && !abrirModal && (
        <div style={{ marginBottom: 16, color: COM_C.verde, fontSize: 13, fontWeight: 600 }}>
          Safra salva com sucesso.
        </div>
      )}

      <div className="com-kpi-grid-3">
        <KpiCard label="Total de safras" value={String(totais.total)} icon="ti-calendar-stats" cor={COM_C.marrom} corLt={COM_C.marromLt} />
        <KpiCard label="Em andamento" value={String(totais.emAndamento)} icon="ti-plant" cor={COM_C.verde} corLt={COM_C.verdeLt} />
        <KpiCard label="Em planejamento" value={String(totais.planejamento)} icon="ti-clock" cor={COM_C.azul} corLt={COM_C.azulLt} />
      </div>

      <ContentCard title="Safras cadastradas" subtitle="Histórico e configuração por safra" noPadding>
        <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Safra</th>
              <th>Ano</th>
              <th style={{ textAlign: 'right' }}>Estimativa</th>
              <th style={{ textAlign: 'right' }}>Taxa</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {safras.map(s => {
              const st = STATUS_CORES[s.status]
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.descricao ?? `Safra ${s.ano}`}</td>
                  <td style={{ color: COM_C.txtSub }}>{s.ano}</td>
                  <td style={{ textAlign: 'right', color: COM_C.txtSub }}>
                    {s.estimativa_kg ? `${s.estimativa_kg.toLocaleString('pt-BR')} kg` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{s.taxa_comercializacao}%</td>
                  <td>
                    <Badge label={STATUS_LABEL[s.status]} bg={st.bg} cor={st.cor} dot />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Btn variante="marrom-outline" tamanho="sm" onClick={() => abrirEdicao(s)}>
                      Editar
                    </Btn>
                  </td>
                </tr>
              )
            })}
            {safras.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: COM_C.txtSub }}>
                  Nenhuma safra cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ContentCard>

      {abrirModal && (
        <Modal
          titulo={editando ? 'Editar safra' : 'Nova safra'}
          subtitulo="Configure ano, taxa e status da safra"
          onClose={() => { setAbrirModal(false); setEditando(null) }}
          largura={440}
          footer={
            <>
              <Btn variante="cinza" onClick={() => { setAbrirModal(false); setEditando(null) }}>
                Cancelar
              </Btn>
              <Btn variante="marrom" onClick={handleSalvar} disabled={status === 'salvando'}>
                {status === 'salvando' ? 'Salvando...' : 'Salvar'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Ano *">
                  <Input
                    type="number"
                    value={form.ano}
                    onChange={e => setForm(f => ({ ...f, ano: parseInt(e.target.value) }))}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Taxa comercialização (%)">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxa_comercializacao}
                    onChange={e => setForm(f => ({ ...f, taxa_comercializacao: e.target.value }))}
                  />
                </Field>
              </div>
            </div>

            <Field label="Descrição">
              <Input
                value={form.descricao}
                placeholder="Ex: Safra Principal 2026"
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </Field>

            <Field label="Estimativa de produção (kg)">
              <Input
                type="number"
                step="0.001"
                value={form.estimativa_kg}
                placeholder="Opcional"
                onChange={e => setForm(f => ({ ...f, estimativa_kg: e.target.value }))}
              />
            </Field>

            <Field
              label="Status"
              hint={form.status === 'em_andamento' ? 'A safra atual em andamento será encerrada automaticamente.' : undefined}
            >
              <Select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as 'planejamento' | 'em_andamento' | 'encerrada' }))}
              >
                <option value="planejamento">Planejamento</option>
                <option value="em_andamento">Em andamento</option>
                <option value="encerrada">Encerrada</option>
              </Select>
            </Field>

            {status === 'erro' && (
              <div style={{ color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>
            )}
          </div>
        </Modal>
      )}
    </PageLayout>
  )
}