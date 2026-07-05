'use client'

import { useState } from 'react'
import {
  PageLayout, MODULO_LOJA, COM_C, ContentCard, Field, Input, AlertBanner, KpiCard,
} from '@/components/nexcoop/ui'
import { buscarCooperadoPorCPF } from '@/lib/loja/actions'
import type { CooperadoIdentificado } from '@/lib/loja/types'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarCPF(cpf: string) {
  const s = cpf.replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

interface Props {
  orgId: string
  temComercializacao: boolean
}

export default function ContaCorrenteClient({ orgId, temComercializacao }: Props) {
  const [cpf, setCpf] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')
  const [cooperado, setCooperado] = useState<CooperadoIdentificado | null>(null)

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    const cpfLimpo = cpf.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) {
      setErro('Informe um CPF válido com 11 dígitos.')
      return
    }

    setBuscando(true)
    setErro('')
    setCooperado(null)

    const resultado = await buscarCooperadoPorCPF(orgId, cpfLimpo)
    setBuscando(false)

    if (!resultado) {
      setErro('Nenhum cooperado ativo encontrado com este CPF.')
      return
    }

    setCooperado(resultado)
  }

  function limpar() {
    setCpf('')
    setCooperado(null)
    setErro('')
  }

  return (
    <PageLayout
      titulo="Conta Corrente"
      subtitulo="Consulte o saldo financeiro do cooperado"
      icone="ti-wallet"
      modulo={MODULO_LOJA}
      breadcrumb={[{ label: 'Gestão' }, { label: 'Conta Corrente' }]}
    >
      <ContentCard title="Buscar cooperado">
        <form onSubmit={handleBuscar} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Field label="CPF do cooperado">
              <Input
                type="text"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={buscando}
            style={{
              padding: '10px 18px', background: COM_C.laranja, color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: buscando ? 'wait' : 'pointer', opacity: buscando ? 0.7 : 1,
            }}
          >
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
          {cooperado && (
            <button
              type="button"
              onClick={limpar}
              style={{
                padding: '10px 14px', background: '#fff', color: COM_C.txtSub,
                border: `1px solid ${COM_C.borda}`, borderRadius: 8, fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Limpar
            </button>
          )}
        </form>
        {erro && (
          <div style={{ marginTop: 12 }}>
            <AlertBanner tipo="erro">{erro}</AlertBanner>
          </div>
        )}
      </ContentCard>

      {cooperado && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="com-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <KpiCard
              label="Cooperado"
              value={cooperado.nome}
              sub={formatarCPF(cpf)}
              icon="ti-user"
              cor={COM_C.azul}
              corLt={COM_C.azulLt}
            />
            {temComercializacao && cooperado.tem_conta_corrente ? (
              <KpiCard
                label="Saldo financeiro"
                value={fmt(cooperado.saldo_financeiro)}
                sub="Conta do produtor"
                icon="ti-cash"
                cor={cooperado.saldo_financeiro >= 0 ? COM_C.verde : COM_C.vermelho}
                corLt={cooperado.saldo_financeiro >= 0 ? COM_C.verdeLt : COM_C.vermelhoLt}
              />
            ) : (
              <KpiCard
                label="Conta corrente"
                value="Indisponível"
                sub="Módulo comercialização inativo"
                icon="ti-info-circle"
                cor={COM_C.txtSub}
                corLt="#F5F5F4"
              />
            )}
          </div>

          {temComercializacao && cooperado.produtor_id && (
            <ContentCard title="Extrato completo">
              <p style={{ fontSize: 13, color: COM_C.txtSub, margin: '0 0 14px' }}>
                Gere o extrato detalhado de movimentações do produtor vinculado a este cooperado.
              </p>
              <a
                href={`/api/comercializacao/extrato-produtor/${cooperado.produtor_id}?tipo=total`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', background: COM_C.azul, color: '#fff',
                  borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none',
                }}
              >
                <i className="ti ti-file-type-pdf" style={{ fontSize: 16 }} />
                Abrir extrato do produtor (PDF)
              </a>
            </ContentCard>
          )}
        </div>
      )}
    </PageLayout>
  )
}