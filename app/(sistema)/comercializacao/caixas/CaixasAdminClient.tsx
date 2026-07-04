'use client'

import { useState } from 'react'
import { forcarFechamentoSessao } from './actions'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

function fmtHora(iso: string) {
  const d = new Date(iso)
  const h = String(d.getUTCHours() - 3).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function fmtData(iso: string) {
  const d = new Date(iso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  const ano = d.getUTCFullYear()
  return `${dia}/${mes}/${ano}`
}

function fmtBrl(v: number) {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

type SessaoAberta = {
  id: string
  saldo_inicial_especie: number
  hora_abertura: string
  usuario_id: string
  usuarios: { nome_completo: string } | null
}

type SessaoFechada = {
  id: string
  saldo_inicial_especie: number
  hora_abertura: string
  hora_fechamento: string | null
  total_saidas_especie: number | null
  total_pix: number | null
  saldo_final_especie: number | null
  usuario_id: string
  usuarios: { nome_completo: string } | null
}

export default function CaixasAdminClient({
  abertos,
  fechados,
}: {
  abertos: SessaoAberta[]
  fechados: SessaoFechada[]
}) {
  const [lista, setLista] = useState(abertos)
  const [carregando, setCarregando] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [confirmar, setConfirmar] = useState<SessaoAberta | null>(null)

  async function handleForcar(sessao: SessaoAberta) {
    setCarregando(sessao.id)
    const res = await forcarFechamentoSessao(sessao.id)
    setCarregando(null)
    if (res.error) {
      setMensagem({ tipo: 'erro', texto: res.error })
    } else {
      setLista(l => l.filter(s => s.id !== sessao.id))
      setMensagem({ tipo: 'ok', texto: `Caixa de ${sessao.usuarios?.nome_completo ?? 'operador'} fechado com sucesso.` })
    }
    setConfirmar(null)
  }

  return (
    <PageLayout
      titulo="Caixas"
      icone="ti-cash"
      breadcrumb={[{ label: 'Caixas' }]}
      fullHeight
      acoes={
        lista.length > 0 ? (
          <Badge
            label={`${lista.length} aberto${lista.length !== 1 ? 's' : ''}`}
            bg={COM_C.verdeLt}
            cor={COM_C.verde}
            dot
          />
        ) : undefined
      }
    >
      {mensagem && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          background: mensagem.tipo === 'ok' ? COM_C.verdeLt : COM_C.vermelhoLt,
          color: mensagem.tipo === 'ok' ? COM_C.verde : COM_C.vermelho,
          fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {mensagem.texto}
          <button onClick={() => setMensagem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>×</button>
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <div className="com-section-label">Caixas abertos agora ({lista.length})</div>

        {lista.length === 0 ? (
          <EmptyState emoji="💰" titulo="Nenhum caixa aberto no momento" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lista.map(sessao => (
              <ContentCard key={sessao.id} padding="16px 20px">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: COM_C.txt, fontSize: 14 }}>
                      {sessao.usuarios?.nome_completo ?? 'Operador'}
                    </div>
                    <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>
                      Aberto às {fmtHora(sessao.hora_abertura)} · Fundo: {fmtBrl(sessao.saldo_inicial_especie)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge label="Aberto" bg={COM_C.verdeLt} cor={COM_C.verde} dot />
                    <Btn
                      variante="cinza"
                      tamanho="sm"
                      onClick={() => setConfirmar(sessao)}
                      disabled={carregando === sessao.id}
                      style={{ background: COM_C.vermelhoLt, color: COM_C.vermelho, borderColor: '#fecaca' }}
                    >
                      {carregando === sessao.id ? 'Fechando...' : 'Forçar fechamento'}
                    </Btn>
                  </div>
                </div>
              </ContentCard>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="com-section-label">Fechamentos recentes</div>
        <ContentCard noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  {['Operador', 'Data', 'Aberto', 'Fechado', 'Saídas Espécie', 'Total Pix', 'Saldo Final'].map(h => (
                    <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fechados.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: COM_C.txtSub }}>Nenhum fechamento registrado</td></tr>
                )}
                {fechados.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.usuarios?.nome_completo ?? '—'}</td>
                    <td style={{ color: COM_C.txtSub }}>{fmtData(s.hora_abertura)}</td>
                    <td style={{ color: COM_C.txtSub }}>{fmtHora(s.hora_abertura)}</td>
                    <td style={{ color: COM_C.txtSub }}>{s.hora_fechamento ? fmtHora(s.hora_fechamento) : '—'}</td>
                    <td style={{ color: COM_C.txtSub }}>{fmtBrl(s.total_saidas_especie ?? 0)}</td>
                    <td style={{ color: COM_C.txtSub }}>{fmtBrl(s.total_pix ?? 0)}</td>
                    <td style={{ fontWeight: 600 }}>{fmtBrl(s.saldo_final_especie ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>
      </div>

      {confirmar && (
        <Modal
          titulo="Forçar fechamento"
          onClose={() => setConfirmar(null)}
          footer={
            <>
              <Btn variante="cinza" onClick={() => setConfirmar(null)}>Cancelar</Btn>
              <Btn
                variante="cinza"
                onClick={() => handleForcar(confirmar)}
                style={{ background: COM_C.vermelho, color: '#fff', borderColor: COM_C.vermelho }}
              >
                Confirmar
              </Btn>
            </>
          }
        >
          <p style={{ fontSize: 13, color: COM_C.txtSub, margin: '0 0 16px' }}>
            Fechar o caixa de <strong>{confirmar.usuarios?.nome_completo ?? 'operador'}</strong> aberto às {fmtHora(confirmar.hora_abertura)}?
          </p>
          <div style={{ background: COM_C.laranjaLt, border: '1px solid #fed7aa', borderRadius: 8, padding: 12, fontSize: 12, color: '#9a3412' }}>
            ⚠️ O operador não verá o resumo de fechamento. Use apenas quando necessário.
          </div>
        </Modal>
      )}
    </PageLayout>
  )
}