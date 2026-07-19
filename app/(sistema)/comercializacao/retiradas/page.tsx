'use client'

import { useEffect, useState } from 'react'
import {
  listarRetiradas,
  registrarRetirada,
  confirmarPesoRetirada,
  getEstoqueFisico
} from '@/lib/comercializacao/retiradas.actions'
import { listarProdutos } from '@/lib/comercializacao/produtos.actions'
import { listarVendas } from '@/lib/comercializacao/vendas.actions'
import { listarSafras } from '@/lib/comercializacao/safras.actions'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

type Retirada = {
  id: string
  produto_id: string
  data_retirada: string
  destino: string
  quantidade_retirada: number
  quantidade_confirmada: number | null
  numero_nf: string | null
  observacoes: string | null
  produtos: { nome: string; unidade: string } | null
  vendas_externas: {
    lotes: { codigo: string } | null
    compradores: { nome: string } | null
  } | null
}

type EstoqueFisico = {
  produto_id: string
  quantidade: number
  produtos: { nome: string; unidade: string } | null
}

type Produto = { id: string; nome: string; unidade: string }
type Venda = { id: string; lotes: { codigo: string } | null; compradores: { nome: string } | null; status: string }
type Safra = { id: string; ano: number; descricao: string | null; status: string }

const formVazio = {
  produto_id: '',
  data_retirada: new Date().toISOString().split('T')[0],
  destino: '',
  quantidade_retirada: '',
  numero_nf: '',
  venda_externa_id: '',
  safra_id: '',
  observacoes: ''
}

export default function RetiradasPage() {
  const [retiradas, setRetiradas] = useState<Retirada[]>([])
  const [estoque, setEstoque] = useState<EstoqueFisico[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [form, setForm] = useState(formVazio)
  const [abrirModal, setAbrirModal] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [pesoConfirmado, setPesoConfirmado] = useState('')
  const [status, setStatus] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [r, e, p, v, s] = await Promise.all([
      listarRetiradas(),
      getEstoqueFisico(),
      listarProdutos(),
      listarVendas(),
      listarSafras()
    ])
    setRetiradas(r as unknown as Retirada[])
    setEstoque(e as unknown as EstoqueFisico[])
    setProdutos(p.filter((x: any) => x.ativo))
    setVendas((v as unknown as Venda[]).filter(x => x.status === 'confirmada' || x.status === 'entregue'))
    setSafras(s as unknown as Safra[])
    if (p.length > 0) setForm(f => ({ ...f, produto_id: p[0].id }))
  }

  async function handleRegistrar() {
    if (!form.produto_id || !form.destino || !form.quantidade_retirada) return
    setStatus('salvando')
    try {
      await registrarRetirada({
        produto_id: form.produto_id,
        data_retirada: form.data_retirada,
        destino: form.destino,
        quantidade_retirada: parseFloat(form.quantidade_retirada),
        numero_nf: form.numero_nf || undefined,
        venda_externa_id: form.venda_externa_id || undefined,
        safra_id: form.safra_id || undefined,
        observacoes: form.observacoes || undefined
      })
      setForm(formVazio)
      setAbrirModal(false)
      await carregar()
      setStatus('sucesso')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: any) {
      setErroMsg(e.message)
      setStatus('erro')
    }
  }

  async function handleConfirmarPeso() {
    if (!confirmandoId || !pesoConfirmado) return
    try {
      await confirmarPesoRetirada(confirmandoId, parseFloat(pesoConfirmado))
      setConfirmandoId(null)
      setPesoConfirmado('')
      await carregar()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const estoqueAtual = form.produto_id
    ? estoque.find(e => e.produto_id === form.produto_id)
    : null

  return (
    <PageLayout
      titulo="Retiradas"
      icone="ti-truck-delivery"
      breadcrumb={[{ label: 'Retiradas' }]}
      fullHeight
      acoes={
        <Btn variante="marrom" icone="ti-plus" onClick={() => setAbrirModal(true)}>Registrar retirada</Btn>
      }
    >
      {status === 'sucesso' && (
        <div style={{ marginBottom: 16, color: COM_C.verde, fontSize: 13 }}>Retirada registrada com sucesso.</div>
      )}

      {estoque.length > 0 && (
        <div
          className="com-kpi-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}
        >
          {estoque.map(e => (
            <KpiCard
              key={e.produto_id}
              label="Estoque físico"
              value={`${e.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} ${e.produtos?.unidade ?? 'kg'}`}
              sub={e.produtos?.nome}
              icon="ti-package"
              cor={COM_C.marrom}
              corLt={COM_C.marromLt}
            />
          ))}
        </div>
      )}

      <ContentCard noPadding>
        <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Data', 'Produto', 'Destino', 'Qtd retirada', 'Qtd confirmada', 'NF', ''].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 3 && i <= 4 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {retiradas.map(r => (
              <tr key={r.id}>
                <td style={{ color: COM_C.txtSub }}>
                  {new Date(r.data_retirada).toLocaleDateString('pt-BR')}
                </td>
                <td>{r.produtos?.nome ?? '—'}</td>
                <td style={{ color: COM_C.txtSub }}>{r.destino}</td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>
                  {r.quantidade_retirada.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {r.produtos?.unidade ?? 'kg'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {r.quantidade_confirmada != null ? (
                    <span style={{ color: COM_C.verde, fontWeight: 500 }}>
                      {r.quantidade_confirmada.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {r.produtos?.unidade ?? 'kg'}
                      {r.quantidade_confirmada !== r.quantidade_retirada && (
                        <span style={{ color: COM_C.vermelho, fontSize: 12, marginLeft: 6 }}>
                          (Δ {(r.quantidade_confirmada - r.quantidade_retirada).toFixed(1)})
                        </span>
                      )}
                    </span>
                  ) : (
                    confirmandoId === r.id ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Input
                          type="number" step="0.001" placeholder="0,000"
                          value={pesoConfirmado}
                          onChange={e => setPesoConfirmado(e.target.value)}
                          style={{ width: 90, padding: '4px 8px', fontSize: 13 }}
                        />
                        <Btn variante="verde" tamanho="sm" onClick={handleConfirmarPeso}>OK</Btn>
                        <Btn variante="cinza" tamanho="sm" onClick={() => setConfirmandoId(null)}>✕</Btn>
                      </div>
                    ) : (
                      <span style={{ color: '#9a9a9a', fontSize: 13 }}>Pendente</span>
                    )
                  )}
                </td>
                <td style={{ color: COM_C.txtSub, fontSize: 13 }}>{r.numero_nf ?? '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  {r.quantidade_confirmada == null && confirmandoId !== r.id && (
                    <Btn
                      variante="cinza"
                      tamanho="sm"
                      onClick={() => { setConfirmandoId(r.id); setPesoConfirmado(r.quantidade_retirada.toString()) }}
                      style={{ color: COM_C.marrom, border: 'none', background: 'none', boxShadow: 'none' }}
                    >
                      Confirmar peso
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
            {retiradas.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: COM_C.txtSub }}>
                  Nenhuma retirada registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ContentCard>

      {abrirModal && (
        <Modal
          titulo="Registrar retirada"
          onClose={() => setAbrirModal(false)}
          largura={520}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setAbrirModal(false)}>Cancelar</Btn>
              <Btn variante="marrom" onClick={handleRegistrar} disabled={status === 'salvando'}>
                {status === 'salvando' ? 'Salvando...' : 'Registrar'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Produto *">
                <Select value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
              </Field>
              <Field label="Data *">
                <Input type="date" value={form.data_retirada} onChange={e => setForm(f => ({ ...f, data_retirada: e.target.value }))} />
              </Field>
            </div>

            {estoqueAtual && (
              <div style={{ background: COM_C.marromLt, border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: COM_C.marrom }}>
                Estoque físico disponível: <strong>{estoqueAtual.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {estoqueAtual.produtos?.unidade ?? 'kg'}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Destino *">
                <Input value={form.destino} placeholder="Ex: Moageira Ouricana" onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} />
              </Field>
              <Field label="Quantidade (kg) *">
                <Input type="number" step="0.001" value={form.quantidade_retirada} onChange={e => setForm(f => ({ ...f, quantidade_retirada: e.target.value }))} />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Número NF">
                <Input value={form.numero_nf} placeholder="Opcional" onChange={e => setForm(f => ({ ...f, numero_nf: e.target.value }))} />
              </Field>
              <Field label="Safra">
                <Select value={form.safra_id} onChange={e => setForm(f => ({ ...f, safra_id: e.target.value }))}>
                  <option value="">Nenhuma</option>
                  {safras.map(s => (
                    <option key={s.id} value={s.id}>{s.descricao ?? `Safra ${s.ano}`}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Vincular à venda">
              <Select value={form.venda_externa_id} onChange={e => setForm(f => ({ ...f, venda_externa_id: e.target.value }))}>
                <option value="">Nenhuma</option>
                {vendas.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.lotes?.codigo ?? '—'} — {v.compradores?.nome ?? '—'}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Observações">
              <Input value={form.observacoes} placeholder="Opcional" onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </Field>
          </div>

          {status === 'erro' && (
            <div style={{ marginTop: 12, color: COM_C.vermelho, fontSize: 13 }}>{erroMsg}</div>
          )}
        </Modal>
      )}
    </PageLayout>
  )
}