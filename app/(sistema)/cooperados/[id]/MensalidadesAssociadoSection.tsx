'use client'

// Seção de mensalidades DENTRO do perfil do associado. Exclusiva de associação
// (renderizada só quando orgTipo === 'associacao' em CooperadoPerfil), no espaço
// que na cooperativa é ocupado por Cotas/Pagamentos. É componente NOVO e separado
// de propósito: não toca no caminho da cooperativa (ver feedback do Giorgio 20/07).
// Nada de cota aqui — mensalidade é outra coisa.
//
// Fluxo de baixa (20/07): "Dar baixa" abre modal → forma de pagamento (PIX
// default) → se PIX, upload do comprovante → IA lê e pré-preenche → dedup
// (bloqueia) + validação do recebedor x CNPJ da org (só avisa) → confirma.

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContentCard, COM_C, Modal, Field, Input, Select } from '@/components/nexcoop/ui'
import { Btn } from '@/components/ui/Btn'
import {
  registrarPagamentoMensalidade,
  gerarMensalidadesCooperado,
  verificarComprovante,
  darBaixaMensalidadeComprovante,
  cancelarBaixaMensalidade,
} from '@/lib/mensalidades/actions'
import { lerComprovantePix } from '@/lib/mensalidades/comprovante.actions'
import { hashArquivo, soDigitos, fileParaBase64 } from '@/lib/mensalidades/comprovante-utils'
import { mesAtual, mesesAteDezembro } from '@/lib/mensalidades/gerar-utils'
import type { Mensalidade } from '@/types/database'
import type { ComprovantePixExtraido } from '@/lib/mensalidades/comprovante-types'

const HOJE = new Date().toISOString().split('T')[0]
const BRL = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function fmtMes(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}
function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

// Status efetivo: pendente com vencimento no passado vira "vencido".
function statusEfetivo(m: Mensalidade): 'pago' | 'pendente' | 'vencido' {
  if (m.status === 'pago') return 'pago'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  if (m.data_vencimento && new Date(m.data_vencimento + 'T00:00:00') < hoje) return 'vencido'
  return 'pendente'
}

const STATUS_BADGE: Record<string, { label: string; bg: string; cor: string }> = {
  pago:     { label: 'Pago',     bg: '#dcfce7', cor: '#166534' },
  pendente: { label: 'Pendente', bg: '#fef3c7', cor: '#92400e' },
  vencido:  { label: 'Vencido',  bg: '#fee2e2', cor: '#dc2626' },
}

interface Props {
  cooperadoId: string
  orgId?:      string | null
  orgCnpj?:    string | null
}

export default function MensalidadesAssociadoSection({ cooperadoId, orgId, orgCnpj }: Props) {
  const [lista, setLista]         = useState<Mensalidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState('')

  // Formulário de geração até dezembro
  const [mostrarGerar, setMostrarGerar] = useState(false)
  const [valor, setValor]         = useState('50')
  const [diaVenc, setDiaVenc]     = useState('10')
  const [gerando, setGerando]     = useState(false)

  // Modal de baixa
  const [mensalidadeAlvo, setMensalidadeAlvo] = useState<Mensalidade | null>(null)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await createClient()
      .from('mensalidades')
      .select('*')
      .eq('cooperado_id', cooperadoId)
      .order('mes_referencia', { ascending: false })
      .returns<Mensalidade[]>()
    setLista(data ?? [])
    setCarregando(false)
  }, [cooperadoId])

  useEffect(() => { carregar() }, [carregar])

  async function cancelarBaixa(m: Mensalidade) {
    if (!confirm(`Cancelar a baixa desta mensalidade (${fmtMes(m.mes_referencia)})? A parcela volta a pendente, o lançamento no financeiro é estornado e o comprovante é liberado.`)) return
    setCancelandoId(m.id)
    setErro('')
    const res = await cancelarBaixaMensalidade(m.id)
    if ('error' in res) setErro(res.error)
    else await carregar()
    setCancelandoId(null)
  }

  async function gerar() {
    setGerando(true)
    setErro('')
    const mi = mesAtual()
    const res = await gerarMensalidadesCooperado(cooperadoId, {
      mesInicial:    mi,
      qtdMeses:      mesesAteDezembro(mi),
      diaVencimento: parseInt(diaVenc, 10) || 10,
      valorPadrao:   parseFloat(valor.replace(',', '.')) || 0,
    })
    if ('error' in res) setErro(res.error)
    else {
      setMostrarGerar(false)
      await carregar()
    }
    setGerando(false)
  }

  const totalPendente = lista
    .filter(m => statusEfetivo(m) !== 'pago')
    .reduce((s, m) => s + Number(m.valor), 0)

  return (
    <div style={{ marginTop: 12 }}>
      <ContentCard
        title="Mensalidades"
        action={
          <Btn variante="roxo" tamanho="sm" icone="ti-bolt" onClick={() => setMostrarGerar(v => !v)}>
            Gerar até dezembro
          </Btn>
        }
      >
        {mostrarGerar && (
          <div style={{
            background: '#f8f7f4', border: `1px solid ${COM_C.borda}`, borderRadius: 10,
            padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
          }}>
            <div>
              <label style={lbl}>Valor mensal (R$)</label>
              <input type="number" min="0" step="0.01" value={valor}
                onChange={e => setValor(e.target.value)} style={{ ...inp, width: 120 }} />
            </div>
            <div>
              <label style={lbl}>Dia de vencimento</label>
              <input type="number" min="1" max="31" value={diaVenc}
                onChange={e => setDiaVenc(e.target.value)} style={{ ...inp, width: 110 }} />
            </div>
            <Btn variante="roxo" tamanho="sm" onClick={gerar} disabled={gerando}>
              {gerando ? 'Gerando…' : 'Gerar parcelas'}
            </Btn>
            <span style={{ fontSize: 11, color: COM_C.txtSub }}>
              Do mês atual até dezembro. Meses já existentes não são duplicados.
            </span>
          </div>
        )}

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>
            {erro}
          </div>
        )}

        {carregando ? (
          <div style={{ fontSize: 12, color: '#aaa' }}>Carregando mensalidades…</div>
        ) : lista.length === 0 ? (
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>Nenhuma mensalidade gerada para este associado.</p>
        ) : (
          <>
            {totalPendente > 0 && (
              <div style={{ fontSize: 12, color: COM_C.txtSub, marginBottom: 10 }}>
                Em aberto: <strong style={{ color: '#dc2626' }}>{BRL(totalPendente)}</strong>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e3dc' }}>
                    {['Mês', 'Valor', 'Vencimento', 'Status', ''].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map(m => {
                    const st = statusEfetivo(m)
                    const sb = STATUS_BADGE[st]
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f5f3ef' }}>
                        <td style={td}>{fmtMes(m.mes_referencia)}</td>
                        <td style={{ ...td, fontWeight: 600 }}>
                          {/* Paga com comprovante → mostra o valor REAL pago; senão o parâmetro. */}
                          {st === 'pago' && m.comprovante_valor != null
                            ? BRL(Number(m.comprovante_valor))
                            : BRL(Number(m.valor))}
                          {st === 'pago' && m.comprovante_valor != null && Number(m.comprovante_valor) !== Number(m.valor) && (
                            <span style={{ fontSize: 10, color: COM_C.txtSub, fontWeight: 400, marginLeft: 4 }}>
                              (gerado {BRL(Number(m.valor))})
                            </span>
                          )}
                        </td>
                        <td style={td}>{st === 'pago' ? `Pago ${fmtData(m.data_pagamento)}` : fmtData(m.data_vencimento)}</td>
                        <td style={td}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: sb.bg, color: sb.cor }}>
                            {sb.label}
                          </span>
                        </td>
                        <td style={td}>
                          {st !== 'pago' ? (
                            <button onClick={() => setMensalidadeAlvo(m)}
                              style={{ fontSize: 11, padding: '3px 10px', background: '#E6F1FB', color: '#185FA5', border: '1px solid #93c5fd', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                              Dar baixa
                            </button>
                          ) : (
                            <button onClick={() => cancelarBaixa(m)} disabled={cancelandoId === m.id}
                              style={{ fontSize: 11, padding: '3px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: cancelandoId === m.id ? 'wait' : 'pointer', fontWeight: 500 }}>
                              {cancelandoId === m.id ? 'Cancelando…' : 'Cancelar baixa'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ContentCard>

      {mensalidadeAlvo && (
        <ModalBaixa
          mensalidade={mensalidadeAlvo}
          orgId={orgId ?? null}
          orgCnpj={orgCnpj ?? null}
          onClose={() => setMensalidadeAlvo(null)}
          onConcluido={() => { setMensalidadeAlvo(null); carregar() }}
        />
      )}
    </div>
  )
}

// ── Modal de baixa ────────────────────────────────────────────────────────────

interface ModalBaixaProps {
  mensalidade: Mensalidade
  orgId: string | null
  orgCnpj: string | null
  onClose: () => void
  onConcluido: () => void
}

type FormaPagamento = 'pix' | 'dinheiro' | 'cartao' | 'outro'

function ModalBaixa({ mensalidade, orgId, orgCnpj, onClose, onConcluido }: ModalBaixaProps) {
  const [forma, setForma]       = useState<FormaPagamento>('pix')
  const [arquivo, setArquivo]   = useState<File | null>(null)
  const [lendoIA, setLendoIA]   = useState(false)
  const [erro, setErro]         = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Campos editáveis (pré-preenchidos pela IA, mas o operador confere/edita — human-in-the-loop)
  const [valorInformado, setValorInformado] = useState(String(mensalidade.valor))
  const [dataInformada, setDataInformada]   = useState(HOJE)
  const [pagador, setPagador]               = useState('')
  const [idTransacao, setIdTransacao]       = useState('')
  const [instituicao, setInstituicao]       = useState('')
  const [hash, setHash]                     = useState<string | null>(null)
  const [dadosComprovante, setDadosComprovante] = useState<ComprovantePixExtraido | null>(null)

  // Avisos (não bloqueiam, exceto duplicidade)
  const [duplicado, setDuplicado] = useState<{ cooperadoNome: string; mesReferencia: string } | null>(null)
  const [recebedorDivergente, setRecebedorDivergente] = useState(false)
  const [valorDivergente, setValorDivergente] = useState(false)

  async function lerArquivo(file: File) {
    setArquivo(file)
    setErro('')
    setDuplicado(null)
    setLendoIA(true)
    try {
      const [b64, h] = await Promise.all([fileParaBase64(file), hashArquivo(file)])
      setHash(h)

      const res = await lerComprovantePix(b64, file.type)
      if ('error' in res) {
        setErro(res.error)
        setLendoIA(false)
        return
      }

      const d = res.dados
      setDadosComprovante(d)
      if (d.valor != null) setValorInformado(String(d.valor))
      if (d.data_pagamento) setDataInformada(d.data_pagamento)
      if (d.pagador_nome) setPagador(d.pagador_nome)
      if (d.id_transacao) setIdTransacao(d.id_transacao)
      if (d.instituicao_pagador) setInstituicao(d.instituicao_pagador)

      // Divergência de valor (informativa, não bloqueia)
      setValorDivergente(d.valor != null && Math.abs(d.valor - Number(mensalidade.valor)) > 0.009)

      // Validação do recebedor x CNPJ da org (informativa, não bloqueia)
      if (orgCnpj && d.recebedor_documento) {
        setRecebedorDivergente(soDigitos(d.recebedor_documento) !== soDigitos(orgCnpj))
      } else {
        setRecebedorDivergente(false)
      }

      // Dedup — chave primária id_transacao, fallback hash. BLOQUEIA.
      const dedup = await verificarComprovante(d.id_transacao ?? null, h)
      if ('error' in dedup) setErro(dedup.error)
      else if (dedup.duplicado) setDuplicado(dedup.duplicado)
    } catch (e) {
      setErro('Erro ao processar o arquivo: ' + String(e))
    } finally {
      setLendoIA(false)
    }
  }

  async function confirmar() {
    setErro('')
    setConfirmando(true)
    try {
      let comprovanteUrl: string | null = null

      if (forma === 'pix' && arquivo) {
        if (!orgId) {
          setErro('Organização não identificada — não é possível enviar o comprovante.')
          setConfirmando(false)
          return
        }
        const supabase = createClient()
        const path = `${orgId}/mensalidades/${mensalidade.id}/${Date.now()}-${arquivo.name}`
        const { error: uploadErr } = await supabase.storage.from('comprovantes').upload(path, arquivo)
        if (uploadErr) {
          setErro('Erro ao enviar o comprovante: ' + uploadErr.message + ' (bucket "comprovantes" existe no Dashboard?)')
          setConfirmando(false)
          return
        }
        const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(path)
        comprovanteUrl = urlData.publicUrl
      }

      if (forma === 'pix') {
        const res = await darBaixaMensalidadeComprovante({
          mensalidadeId:    mensalidade.id,
          dataPagamento:    dataInformada || HOJE,
          formaPagamento:   forma,
          comprovanteUrl,
          idTransacao:      idTransacao || null,
          hash,
          pagador:          pagador || null,
          valorComprovante: valorInformado ? parseFloat(valorInformado.replace(',', '.')) : null,
          dataComprovante:  dataInformada || null,
          dadosComprovante,
        })
        if ('error' in res) { setErro(res.error); setConfirmando(false); return }
      } else {
        // Formas sem comprovante (dinheiro/cartão/outro) — baixa simples, data = hoje.
        const res = await registrarPagamentoMensalidade(mensalidade.id, HOJE)
        if ('error' in res) { setErro(res.error); setConfirmando(false); return }
      }

      onConcluido()
    } catch (e) {
      setErro('Erro ao confirmar a baixa: ' + String(e))
      setConfirmando(false)
    }
  }

  const bloqueado = !!duplicado
  const podeConfirmar = forma !== 'pix' || (!!arquivo && !lendoIA && !bloqueado)

  return (
    <Modal
      titulo="Dar baixa na mensalidade"
      subtitulo={`${fmtMes(mensalidade.mes_referencia)} — ${BRL(Number(mensalidade.valor))}`}
      onClose={onClose}
      largura={480}
      footer={
        <>
          <Btn variante="cinza" tamanho="sm" onClick={onClose}>Cancelar</Btn>
          <Btn variante="roxo" tamanho="sm" onClick={confirmar} disabled={!podeConfirmar || confirmando}>
            {confirmando ? 'Confirmando…' : 'Confirmar baixa'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Como foi o pagamento?">
          <Select value={forma} onChange={e => setForma(e.target.value as FormaPagamento)}>
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartão</option>
            <option value="outro">Outro</option>
          </Select>
        </Field>

        {forma === 'pix' && (
          <>
            <Field label="Comprovante (imagem ou PDF)">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={e => { const f = e.target.files?.[0]; if (f) lerArquivo(f) }}
                style={inp}
              />
            </Field>

            {lendoIA && (
              <div style={{ fontSize: 12, color: COM_C.txtSub }}>Lendo comprovante…</div>
            )}

            {duplicado && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#dc2626' }}>
                Este comprovante já foi usado para <strong>{duplicado.cooperadoNome}</strong> ({duplicado.mesReferencia}).
              </div>
            )}

            {!duplicado && recebedorDivergente && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#92400e' }}>
                O recebedor do comprovante não confere com o CNPJ da associação. Confira antes de confirmar.
              </div>
            )}

            {!duplicado && valorDivergente && (
              <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#185FA5' }}>
                O valor do comprovante é diferente do valor da mensalidade.
              </div>
            )}

            {arquivo && !lendoIA && (
              <>
                <Field label="Valor (R$)">
                  <Input type="number" step="0.01" value={valorInformado} onChange={e => setValorInformado(e.target.value)} />
                </Field>
                <Field label="Data do pagamento">
                  <Input type="date" value={dataInformada} onChange={e => setDataInformada(e.target.value)} />
                </Field>
                <Field label="Pagador">
                  <Input value={pagador} onChange={e => setPagador(e.target.value)} />
                </Field>
                <Field label="Id da transação (EndToEndId)">
                  <Input value={idTransacao} onChange={e => setIdTransacao(e.target.value)} />
                </Field>
                <Field label="Instituição do pagador">
                  <Input value={instituicao} onChange={e => setInstituicao(e.target.value)} />
                </Field>
              </>
            )}
          </>
        )}

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#dc2626' }}>
            {erro}
          </div>
        )}
      </div>
    </Modal>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #d5d3cc',
  borderRadius: 7, background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5 }
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: '#888', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '8px 8px', fontSize: 12, color: '#1a1a1a', verticalAlign: 'middle' }
