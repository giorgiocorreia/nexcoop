'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { Select } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'
import { listarPagamentosProdutores, type PagamentoProdutorLinha } from '@/lib/comercializacao/pagamentos-produtores'
import { usePdfPagamentosProdutores } from '@/lib/comercializacao/usePdfPagamentosProdutores'
import { NOMES_MESES, mesLabel, fmtRealPagamento, fmtDataPagamento } from '@/lib/comercializacao/pagamentos-produtores-utils'

type Resultado = {
  linhas: PagamentoProdutorLinha[]
  total: number
  totalEspecie: number
  totalPix: number
  count: number
  orgNome: string
  orgCnpj: string
}

const HOJE = new Date()
const ANOS = Array.from({ length: 6 }, (_, i) => HOJE.getFullYear() - i)

export default function PagamentosProdutoresClient() {
  const [mes, setMes] = useState(HOJE.getMonth() + 1)
  const [ano, setAno] = useState(HOJE.getFullYear())
  const [carregando, setCarregando] = useState(true)
  const [dados, setDados] = useState<Resultado | null>(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const { baixarPdf } = usePdfPagamentosProdutores()

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    listarPagamentosProdutores(mes, ano)
      .then((res) => { if (ativo) setDados(res) })
      .catch(() => { if (ativo) setDados(null) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [mes, ano])

  async function handleGerarPdf() {
    if (!dados) return
    setGerandoPdf(true)
    try {
      await baixarPdf({
        orgNome: dados.orgNome,
        orgCnpj: dados.orgCnpj,
        mesLabel: mesLabel(mes, ano),
        linhas: dados.linhas,
        total: dados.total,
        totalEspecie: dados.totalEspecie,
        totalPix: dados.totalPix,
      })
    } finally {
      setGerandoPdf(false)
    }
  }

  const kpis = [
    { label: 'Total pago no período', value: fmtRealPagamento(dados?.total ?? 0), sub: mesLabel(mes, ano), icon: 'ti-cash', cor: COM_C.marrom, corLt: COM_C.marromLt },
    { label: 'Espécie', value: fmtRealPagamento(dados?.totalEspecie ?? 0), sub: 'pago em dinheiro', icon: 'ti-coin', cor: COM_C.verde, corLt: COM_C.verdeLt },
    { label: 'Pix', value: fmtRealPagamento(dados?.totalPix ?? 0), sub: 'pago via Pix', icon: 'ti-qrcode', cor: COM_C.azul, corLt: COM_C.azulLt },
    { label: 'Pagamentos', value: String(dados?.count ?? 0), sub: 'no período', icon: 'ti-list-numbers', cor: COM_C.roxo, corLt: COM_C.roxoLt },
  ]

  return (
    <PageLayout
      titulo="Pagamentos a Produtores"
      subtitulo={`Saques em espécie e Pix registrados no caixa · ${mesLabel(mes, ano)}`}
      icone="ti-report-money"
      breadcrumb={[{ label: 'Pagamentos a Produtores' }]}
      fullHeight
      acoes={
        <>
          <Select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={{ width: 'auto', minWidth: 140 }}>
            {NOMES_MESES.map((nome, i) => (
              <option key={nome} value={i + 1}>{nome}</option>
            ))}
          </Select>
          <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: 'auto', minWidth: 90 }}>
            {ANOS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <Btn variante="marrom" icone="ti-file-download" disabled={!dados || gerandoPdf} onClick={handleGerarPdf}>
            {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
          </Btn>
        </>
      }
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="com-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {kpis.map((k) => (
            <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} cor={k.cor} corLt={k.corLt} />
          ))}
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: COM_C.txtSub, fontSize: 14 }}>
            Carregando...
          </div>
        ) : !dados || dados.linhas.length === 0 ? (
          <EmptyState emoji="💸" titulo="Nenhum pagamento no período" descricao="Não há saques registrados no caixa para produtores neste mês." />
        ) : (
          <ContentCard title="Detalhamento" subtitle={`${dados.linhas.length} pagamento${dados.linhas.length > 1 ? 's' : ''}`} noPadding>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Data', 'Produtor', 'Forma', 'Valor'].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Data' || h === 'Produtor' ? 'left' : 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((l) => (
                  <tr key={l.id}>
                    <td style={{ color: COM_C.txtSub }}>{fmtDataPagamento(l.data)}</td>
                    <td style={{ fontWeight: 600 }}>
                      {l.produtor_nome}
                      {l.produtor_cpf && <div style={{ fontSize: 11, color: COM_C.txtSub, fontWeight: 400 }}>{l.produtor_cpf}</div>}
                    </td>
                    <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{l.forma_pagamento === 'pix' ? 'Pix' : 'Espécie'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: COM_C.marrom }}>{fmtRealPagamento(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ContentCard>
        )}
      </div>
    </PageLayout>
  )
}
