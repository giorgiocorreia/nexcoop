'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { iniciarLote, listarSafras } from './actions'
import { fmt } from '@/lib/fmt'
import { Btn } from '@/components/ui/Btn'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { ListRow } from '@/components/comercializacao/ui/ListRow'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { COM_C, STATUS_LOTE } from '@/components/comercializacao/ui/tokens'

const STATUS_ICONE: Record<string, string> = {
  rascunho: 'ti-pencil',
  aberto: 'ti-lock-open',
  em_venda: 'ti-arrow-up-right',
  entregue: 'ti-circle-check',
}

interface Safra { id: string; ano: number; descricao: string | null }

export default function LotesLista({ lotes }: { lotes: any[] }) {
  const router = useRouter()

  const [modalAberto, setModalAberto] = useState(false)
  const [safras, setSafras] = useState<Safra[]>([])
  const [safraId, setSafraId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function abrirModal() {
    setErro(''); setSafraId(''); setDescricao('')
    setModalAberto(true)
    const lista = await listarSafras()
    setSafras(lista)
    if (lista.length === 1) setSafraId(lista[0].id)
  }

  async function handleConfirmar() {
    if (!safraId)          { setErro('Selecione uma safra.'); return }
    if (!descricao.trim()) { setErro('Informe a descrição do produto.'); return }
    setCarregando(true); setErro('')
    try {
      const lote = await iniciarLote(descricao.trim(), safraId)
      router.push(`/comercializacao/lotes/${lote.id}`)
    } catch (e: any) {
      setErro(e.message); setCarregando(false)
    }
  }

  const totais = {
    total:   lotes.length,
    abertos: lotes.filter(l => l.status === 'aberto').length,
    emVenda: lotes.filter(l => l.status === 'em_venda').length,
    kgTotal: lotes.reduce((acc, l) => acc + (l.peso_total_kg ?? 0), 0),
  }

  return (
    <PageLayout
      titulo="Lotes"
      breadcrumb={[{ label: 'Lotes' }]}
      icone="ti-stack-2"
      fullHeight
      acoes={
        <Btn variante="marrom" icone="ti-plus" onClick={abrirModal}>
          Iniciar lote
        </Btn>
      }
    >
      <div className="com-kpi-grid-4">
        <KpiCard label="Total de lotes" value={String(totais.total)} icon="ti-stack-2" cor={COM_C.marrom} corLt={COM_C.marromLt} />
        <KpiCard label="Abertos" value={String(totais.abertos)} icon="ti-lock-open" cor={COM_C.verde} corLt={COM_C.verdeLt} />
        <KpiCard label="Em venda" value={String(totais.emVenda)} icon="ti-arrow-up-right" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
        <KpiCard label="Kg acumulado" value={fmt.peso(totais.kgTotal)} icon="ti-weight" cor={COM_C.azul} corLt={COM_C.azulLt} />
      </div>

      {lotes.length === 0 ? (
        <EmptyState
          emoji="📦"
          titulo="Nenhum lote criado"
          descricao="Inicie um lote para começar a comercialização"
          acao={{ label: 'Iniciar lote', onClick: abrirModal }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lotes.map(lote => {
            const st = STATUS_LOTE[lote.status] ?? STATUS_LOTE.rascunho
            const icone = STATUS_ICONE[lote.status] ?? STATUS_ICONE.rascunho
            const nfeAutorizada = ((lote.vendas_externas as any[]) ?? []).find((v: any) => v.status_nfe === 'autorizada')
            return (
              <ListRow
                key={lote.id}
                onClick={() => router.push(`/comercializacao/lotes/${lote.id}`)}
                icone={icone}
                iconeBg={st.bg}
                iconeCor={st.cor}
                titulo={`Lote ${lote.codigo}`}
                subtitulo={`${lote.produto_descricao ?? '—'}${lote.safras ? ` · Safra ${lote.safras.ano}` : ''}`}
                direita={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COM_C.txt }}>{fmt.peso(lote.peso_total_kg)}</div>
                      <div style={{ fontSize: 11, color: COM_C.txtSub }}>peso total</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: COM_C.txtSub }}>{fmt.data(lote.created_at)}</div>
                      <div style={{ fontSize: 11, color: COM_C.txtSub }}>criado em</div>
                    </div>
                  </div>
                }
                badges={
                  <>
                    <Badge label={st.label} bg={st.bg} cor={st.cor} />
                    {nfeAutorizada && (
                      <Badge label={`NF-e ${nfeAutorizada.numero_nfe}`} bg={COM_C.verdeLt} cor={COM_C.verde} />
                    )}
                  </>
                }
              />
            )
          })}
        </div>
      )}

      {modalAberto && (
        <Modal
          titulo="Iniciar novo lote"
          subtitulo="Preencha os dados para criar o lote"
          onClose={() => setModalAberto(false)}
          largura={440}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setModalAberto(false)} disabled={carregando}>
                Cancelar
              </Btn>
              <Btn
                variante="marrom"
                onClick={handleConfirmar}
                disabled={carregando || !safraId || !descricao.trim()}
              >
                {carregando ? 'Criando...' : 'Iniciar lote'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Safra *">
              <Select value={safraId} onChange={e => setSafraId(e.target.value)}>
                <option value="">Selecione a safra...</option>
                {safras.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.ano}{s.descricao ? ` — ${s.descricao}` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Descrição do produto *">
              <Input
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirmar()}
                placeholder="Ex: Cacau amêndoa seca, Melancia, Milho..."
              />
            </Field>

            {erro && (
              <div style={{
                background: COM_C.vermelhoLt, border: '1px solid #FECACA', borderRadius: 8,
                padding: '8px 12px', fontSize: 12, color: COM_C.vermelho,
              }}>
                {erro}
              </div>
            )}
          </div>
        </Modal>
      )}
    </PageLayout>
  )
}