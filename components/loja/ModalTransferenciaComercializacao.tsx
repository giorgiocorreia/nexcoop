'use client'

import { useEffect, useState } from 'react'
import {
  registrarSangriaLoja, validarSenhaParaTransferencia,
  getCaixaLojaAbertoDoOperador, abrirCaixaLoja,
} from '@/lib/loja/actions'
import { listarAtendentesComSessaoCaixa } from '@/lib/comercializacao/caixa.actions'
import { getSaldoResponsabilidadeComercializacao } from '@/lib/tesouraria/saldo-responsabilidade'

// Atalho usado quando um pagamento à vista falha por falta de caixa/saldo na
// Loja: puxa o valor que falta do caixa de um atendente da Comercialização
// (sangria lá + aporte aqui, com vínculo de transferência — mesmo fluxo do
// Aporte do PDV), sem sair da tela de Nova Compra.

interface Atendente {
  usuario_id: string
  nome: string
  sessao_id: string
  status: 'aberta' | 'fechada'
}

interface Props {
  orgId: string
  usuarioId: string
  valorSugerido: number
  onFechar: () => void
  onTransferido: () => void
}

const C = {
  laranja: '#E07B30', borda: '#E5E3DC', txt: '#1C1917', txtSub: '#78716C', vermelho: '#dc2626',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 14,
  border: `1.5px solid ${C.borda}`, borderRadius: 8, boxSizing: 'border-box',
}

function fmtReal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function ModalTransferenciaComercializacao({ orgId, usuarioId, valorSugerido, onFechar, onTransferido }: Props) {
  const [caixaId, setCaixaId] = useState<string | null>(null)
  const [carregandoCaixa, setCarregandoCaixa] = useState(true)
  const [abrindoCaixa, setAbrindoCaixa] = useState(false)
  const [atendentes, setAtendentes] = useState<Atendente[]>([])
  const [atendenteId, setAtendenteId] = useState('')
  const [saldoOrigem, setSaldoOrigem] = useState<number | null>(null)
  const [valor, setValor] = useState(valorSugerido.toFixed(2).replace('.', ','))
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    async function init() {
      const [caixa, lista] = await Promise.all([
        getCaixaLojaAbertoDoOperador(orgId, usuarioId),
        listarAtendentesComSessaoCaixa(orgId),
      ])
      setCaixaId(caixa.caixa_id)
      setAtendentes((lista ?? []) as Atendente[])
      setCarregandoCaixa(false)
    }
    init()
  }, [orgId, usuarioId])

  async function selecionarAtendente(id: string) {
    setAtendenteId(id)
    setSaldoOrigem(null)
    if (!id) return
    const resp = await getSaldoResponsabilidadeComercializacao(orgId, id)
    setSaldoOrigem(resp.saldo_atual_especie)
  }

  async function handleAbrirCaixa() {
    setAbrindoCaixa(true)
    setErro('')
    const res = await abrirCaixaLoja(orgId, usuarioId)
    setAbrindoCaixa(false)
    if ('error' in res) { setErro(res.error); return }
    setCaixaId(res.caixaId)
  }

  async function handleTransferir() {
    const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
    if (valorNum <= 0) { setErro('Informe um valor válido.'); return }
    if (!atendenteId) { setErro('Selecione o atendente de origem.'); return }
    if (!senha.trim()) { setErro('Digite a senha de autorização.'); return }
    if (!caixaId) { setErro('Abra seu caixa da Loja antes de transferir.'); return }

    setProcessando(true)
    setErro('')
    const val = await validarSenhaParaTransferencia(orgId, senha, atendenteId)
    if (!val.valido || !val.autorizador_id) {
      setProcessando(false)
      setErro('Senha inválida ou usuário sem permissão.')
      setSenha('')
      return
    }
    const res = await registrarSangriaLoja(
      orgId, caixaId, 'aporte', valorNum, val.autorizador_id, usuarioId,
      'Transferência para pagamento de compra',
      { modulo: 'comercializacao', atendente_origem_id: atendenteId }
    )
    setProcessando(false)
    if ('error' in res) { setErro(res.error); return }
    onTransferido()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: C.txt }}>Transferir da Comercialização</div>
        <div style={{ fontSize: 13, color: C.txtSub, marginBottom: 18 }}>
          Puxa dinheiro do caixa de um atendente da Comercialização pro seu caixa da Loja (sangria lá, aporte aqui, com vínculo de transferência).
        </div>

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#991b1b' }}>
            {erro}
          </div>
        )}

        {carregandoCaixa ? (
          <div style={{ fontSize: 13, color: C.txtSub }}>Carregando...</div>
        ) : !caixaId ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.txt, marginBottom: 10 }}>
              Você não tem caixa da Loja aberto — o aporte precisa de um destino.
            </div>
            <button onClick={handleAbrirCaixa} disabled={abrindoCaixa}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: C.laranja, color: '#fff', border: 'none' }}>
              {abrindoCaixa ? 'Abrindo...' : 'Abrir meu caixa da Loja'}
            </button>
          </div>
        ) : (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.txt, display: 'block', marginBottom: 6 }}>Valor (R$)</label>
            <input type="text" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)}
              style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: C.txt, display: 'block', marginBottom: 6 }}>De qual atendente (Comercialização)</label>
            <select value={atendenteId} onChange={e => selecionarAtendente(e.target.value)} style={{ ...inputStyle, marginBottom: 6 }}>
              <option value="">Selecionar...</option>
              {atendentes.map(a => (
                <option key={a.usuario_id} value={a.usuario_id}>
                  {a.nome} ({a.status === 'aberta' ? 'caixa aberto' : 'caixa fechado'})
                </option>
              ))}
            </select>
            {saldoOrigem !== null && (
              <div style={{ fontSize: 12, marginBottom: 14, color: (parseFloat(valor.replace(',', '.')) || 0) > saldoOrigem ? C.vermelho : C.txtSub }}>
                Saldo disponível: {fmtReal(saldoOrigem)}
              </div>
            )}

            <label style={{ fontSize: 12, fontWeight: 600, color: C.txt, display: 'block', marginBottom: 6 }}>
              Senha de autorização (gerente/admin ou dono do caixa de origem)
            </label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTransferir()}
              placeholder="••••••••" style={{ ...inputStyle, marginBottom: 20 }} />
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onFechar} disabled={processando}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: C.txtSub, border: `1px solid ${C.borda}` }}>
            Cancelar
          </button>
          {caixaId && (
            <button onClick={handleTransferir} disabled={processando || !atendenteId || !senha}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: processando ? 'not-allowed' : 'pointer', background: C.laranja, color: '#fff', border: 'none', opacity: processando ? 0.7 : 1 }}>
              {processando ? 'Transferindo...' : 'Transferir'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
