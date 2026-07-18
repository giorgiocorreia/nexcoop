'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { EmptyState } from '@/components/comercializacao/ui/EmptyState'
import { Select, Input } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'
import { listarSaidasCaixa, type SaidaCaixaLinha, type TipoSaidaCaixa } from '@/lib/comercializacao/saidas-caixa'
import { usePdfSaidasCaixa } from '@/lib/comercializacao/usePdfSaidasCaixa'
import {
  NOMES_MESES,
  TIPOS_SAIDA_CAIXA,
  mesLabel,
  labelTipoSaida,
  fmtRealSaida,
  fmtDataSaida,
  agregarSaidas,
  filtrarSaidasCaixa,
  type FiltrosSaidaCaixa,
} from '@/lib/comercializacao/saidas-caixa-utils'

type Resultado = {
  linhas: SaidaCaixaLinha[]
  orgNome: string
  orgCnpj: string
}

// Chaves dos filtros aditivos (mês/ano ficam fixos, fora do padrão "+ Filtro").
type ChaveFiltro = 'tipo' | 'forma' | 'produtor'

const OPCOES_FILTRO: { chave: ChaveFiltro; label: string; icone: string }[] = [
  { chave: 'tipo', label: 'Tipo de saída', icone: 'ti-category' },
  { chave: 'forma', label: 'Forma de pagamento', icone: 'ti-credit-card' },
  { chave: 'produtor', label: 'Produtor', icone: 'ti-user' },
]

const HOJE = new Date()
const ANOS = Array.from({ length: 6 }, (_, i) => HOJE.getFullYear() - i)

export default function SaidasCaixaClient() {
  const [mes, setMes] = useState(HOJE.getMonth() + 1)
  const [ano, setAno] = useState(HOJE.getFullYear())
  const [carregando, setCarregando] = useState(true)
  const [dados, setDados] = useState<Resultado | null>(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const { baixarPdf } = usePdfSaidasCaixa()

  // Filtros aditivos — chips na tela, combináveis entre si.
  const [filtrosAtivos, setFiltrosAtivos] = useState<ChaveFiltro[]>([])
  const [menuFiltroAberto, setMenuFiltroAberto] = useState(false)
  const [tiposSelecionados, setTiposSelecionados] = useState<TipoSaidaCaixa[]>([])
  const [formaSelecionada, setFormaSelecionada] = useState<'especie' | 'pix'>('especie')
  const [produtorTermo, setProdutorTermo] = useState('')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    listarSaidasCaixa(mes, ano)
      .then((res) => { if (ativo) setDados(res) })
      .catch(() => { if (ativo) setDados(null) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [mes, ano])

  const filtros: FiltrosSaidaCaixa = useMemo(() => ({
    tipos: filtrosAtivos.includes('tipo') ? tiposSelecionados : undefined,
    forma: filtrosAtivos.includes('forma') ? formaSelecionada : undefined,
    produtor: filtrosAtivos.includes('produtor') ? produtorTermo : undefined,
  }), [filtrosAtivos, tiposSelecionados, formaSelecionada, produtorTermo])

  const linhasFiltradas = useMemo(
    () => (dados ? filtrarSaidasCaixa(dados.linhas, filtros) : []),
    [dados, filtros]
  )
  const resumo = useMemo(() => agregarSaidas(linhasFiltradas), [linhasFiltradas])

  function adicionarFiltro(chave: ChaveFiltro) {
    setFiltrosAtivos((prev) => (prev.includes(chave) ? prev : [...prev, chave]))
    setMenuFiltroAberto(false)
  }

  function removerFiltro(chave: ChaveFiltro) {
    setFiltrosAtivos((prev) => prev.filter((c) => c !== chave))
    if (chave === 'tipo') setTiposSelecionados([])
    if (chave === 'produtor') setProdutorTermo('')
  }

  function toggleTipo(tipo: TipoSaidaCaixa) {
    setTiposSelecionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    )
  }

  function filtrosLabel(): string | undefined {
    const partes: string[] = []
    if (filtrosAtivos.includes('tipo') && tiposSelecionados.length > 0) {
      partes.push(`Tipo: ${tiposSelecionados.map(labelTipoSaida).join(', ')}`)
    }
    if (filtrosAtivos.includes('forma')) {
      partes.push(`Forma: ${formaSelecionada === 'pix' ? 'Pix' : 'Espécie'}`)
    }
    if (filtrosAtivos.includes('produtor') && produtorTermo.trim()) {
      partes.push(`Produtor: "${produtorTermo.trim()}"`)
    }
    return partes.length > 0 ? partes.join(' · ') : undefined
  }

  async function handleGerarPdf() {
    if (!dados) return
    setGerandoPdf(true)
    try {
      await baixarPdf({
        orgNome: dados.orgNome,
        orgCnpj: dados.orgCnpj,
        mesLabel: mesLabel(mes, ano),
        filtrosLabel: filtrosLabel(),
        linhas: linhasFiltradas,
        total: resumo.total,
        totalEspecie: resumo.totalEspecie,
        totalPix: resumo.totalPix,
      })
    } finally {
      setGerandoPdf(false)
    }
  }

  const kpis = [
    { label: 'Total de saídas', value: fmtRealSaida(resumo.total), sub: mesLabel(mes, ano), icon: 'ti-arrow-bar-to-down', cor: COM_C.marrom, corLt: COM_C.marromLt },
    { label: 'Espécie', value: fmtRealSaida(resumo.totalEspecie), sub: 'pago em dinheiro', icon: 'ti-coin', cor: COM_C.verde, corLt: COM_C.verdeLt },
    { label: 'Pix', value: fmtRealSaida(resumo.totalPix), sub: 'pago via Pix', icon: 'ti-qrcode', cor: COM_C.azul, corLt: COM_C.azulLt },
    { label: 'Saídas', value: String(resumo.count), sub: 'no período filtrado', icon: 'ti-list-numbers', cor: COM_C.roxo, corLt: COM_C.roxoLt },
  ]

  const opcoesDisponiveis = OPCOES_FILTRO.filter((o) => !filtrosAtivos.includes(o.chave))

  return (
    <PageLayout
      titulo="Saídas de Caixa"
      subtitulo="Todo dinheiro que saiu do caixa da Comercialização — produtores, avulsas e sangrias"
      icone="ti-report-money"
      breadcrumb={[{ label: 'Saídas de Caixa' }]}
      fullHeight
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* KPIs — sempre refletem o resultado já filtrado */}
        <div className="com-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {kpis.map((k) => (
            <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} cor={k.cor} corLt={k.corLt} />
          ))}
        </div>

        {/* Barra de filtros — mês/ano fixos + filtros aditivos em chip + PDF */}
        <div style={{
          background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
          padding: '16px 18px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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

            <div style={{ width: 1, height: 24, background: COM_C.borda, margin: '0 2px' }} />

            {/* Chips de filtro ativo */}
            {filtrosAtivos.includes('tipo') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                background: COM_C.roxoLt, border: `1px solid ${COM_C.roxo}44`, borderRadius: 8,
                padding: '5px 8px 5px 10px',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: COM_C.roxo }}>Tipo:</span>
                {TIPOS_SAIDA_CAIXA.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => toggleTipo(t.valor)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      border: `1px solid ${tiposSelecionados.includes(t.valor) ? COM_C.roxo : COM_C.borda}`,
                      background: tiposSelecionados.includes(t.valor) ? COM_C.roxo : '#fff',
                      color: tiposSelecionados.includes(t.valor) ? '#fff' : COM_C.txtSub,
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
                <button type="button" onClick={() => removerFiltro('tipo')} title="Remover filtro"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: COM_C.roxo, padding: 2, display: 'flex' }}>
                  <i className="ti ti-x" style={{ fontSize: 14 }} />
                </button>
              </div>
            )}

            {filtrosAtivos.includes('forma') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: COM_C.azulLt, border: `1px solid ${COM_C.azul}44`, borderRadius: 8,
                padding: '5px 8px 5px 10px',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: COM_C.azul }}>Forma:</span>
                {(['especie', 'pix'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormaSelecionada(f)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      border: `1px solid ${formaSelecionada === f ? COM_C.azul : COM_C.borda}`,
                      background: formaSelecionada === f ? COM_C.azul : '#fff',
                      color: formaSelecionada === f ? '#fff' : COM_C.txtSub,
                      cursor: 'pointer',
                    }}
                  >
                    {f === 'pix' ? 'Pix' : 'Espécie'}
                  </button>
                ))}
                <button type="button" onClick={() => removerFiltro('forma')} title="Remover filtro"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: COM_C.azul, padding: 2, display: 'flex' }}>
                  <i className="ti ti-x" style={{ fontSize: 14 }} />
                </button>
              </div>
            )}

            {filtrosAtivos.includes('produtor') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: COM_C.verdeLt, border: `1px solid ${COM_C.verde}44`, borderRadius: 8,
                padding: '5px 8px 5px 10px',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>Produtor:</span>
                <Input
                  value={produtorTermo}
                  onChange={(e) => setProdutorTermo(e.target.value)}
                  placeholder="Nome..."
                  autoFocus
                  style={{ width: 140, padding: '3px 8px', fontSize: 12, border: `1px solid ${COM_C.verde}66` }}
                />
                <button type="button" onClick={() => removerFiltro('produtor')} title="Remover filtro"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#15803D', padding: 2, display: 'flex' }}>
                  <i className="ti ti-x" style={{ fontSize: 14 }} />
                </button>
              </div>
            )}

            {/* Botão "+ Filtro" com menu das chaves ainda não usadas */}
            {opcoesDisponiveis.length > 0 && (
              <div style={{ position: 'relative' }}>
                <Btn variante="cinza" tamanho="sm" icone="ti-plus" onClick={() => setMenuFiltroAberto((v) => !v)}>
                  Filtro
                </Btn>
                {menuFiltroAberto && (
                  <>
                    <div onClick={() => setMenuFiltroAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 21,
                      background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden',
                    }}>
                      {opcoesDisponiveis.map((o) => (
                        <button
                          key={o.chave}
                          type="button"
                          onClick={() => adicionarFiltro(o.chave)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 13, color: COM_C.txt,
                          }}
                        >
                          <i className={`ti ${o.icone}`} style={{ fontSize: 15, color: COM_C.txtSub }} />
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ flex: 1 }} />
            <Btn variante="marrom" icone="ti-file-download" disabled={!dados || gerandoPdf} onClick={handleGerarPdf}>
              {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
            </Btn>
          </div>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: COM_C.txtSub, fontSize: 14 }}>
            Carregando...
          </div>
        ) : !dados || linhasFiltradas.length === 0 ? (
          <EmptyState emoji="💸" titulo="Nenhuma saída no período" descricao="Não há saídas de caixa registradas neste mês com os filtros aplicados." />
        ) : (
          <ContentCard title="Detalhamento" subtitle={`${linhasFiltradas.length} saída${linhasFiltradas.length > 1 ? 's' : ''}`} noPadding>
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Data', 'Tipo', 'Descrição', 'Forma', 'Valor'].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Valor' || h === 'Forma' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map((l) => (
                  <tr key={l.id}>
                    <td style={{ color: COM_C.txtSub }}>{fmtDataSaida(l.data)}</td>
                    <td style={{ color: COM_C.txtSub }}>{labelTipoSaida(l.tipo)}</td>
                    <td style={{ fontWeight: 600 }}>{l.descricao}</td>
                    <td style={{ textAlign: 'right', color: COM_C.txtSub }}>{l.forma_pagamento === 'pix' ? 'Pix' : 'Espécie'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: COM_C.marrom }}>{fmtRealSaida(l.valor)}</td>
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
