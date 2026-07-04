'use client'

import { useTransition, useState } from 'react'
import { atualizarIndiceNex, registrarCotacaoMoageira } from '@/lib/dashboard/indice-nex.actions'
import { PageLayout } from '@/components/comercializacao/ui/PageLayout'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { ContentCard } from '@/components/comercializacao/ui/ContentCard'
import { Badge } from '@/components/comercializacao/ui/Badge'
import { Field, Input, Select } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'
import { Btn } from '@/components/ui/Btn'

type Snapshot = {
  score_final: number
  faixa: string
  score_oferta: number | null
  score_demanda: number | null
  score_financeiro: number | null
  score_macro: number | null
  prob_forte_alta: number | null
  prob_alta: number | null
  prob_estavel: number | null
  prob_baixa: number | null
  calculado_em: string
}
type HistoricoItem = { calculado_em: string; score_final: number; faixa: string }
type Sinal = { titulo: string | null; dimensao: string; fonte: string; url: string | null; impacto: number; coletado_em: string }
type Cotacao = { fonte: string; preco_brl: number | null; data_referencia: string }
type CotacaoOrg = { preco_cooperado: number; preco_externo: number; data: string; obs: string | null }

interface Props {
  snapshot: Snapshot | null
  historico: HistoricoItem[]
  sinais: Sinal[]
  cotacoes: Cotacao[]
  ultimasCotacoesOrg: CotacaoOrg[]
  precoBahia: { preco_brl: number | null } | null
  usdBrl: { preco_brl: number | null; cambio_usd_brl: number | null } | null
  orgId: string
}

const NOME_MOAGEIRA: Record<string, string> = {
  barry_callebaut: 'Barry Callebaut',
  cargill: 'Cargill',
  olam: 'Olam / OFI',
}
const BANDEIRA: Record<string, string> = {
  barry_callebaut: '🇨🇭',
  cargill: '🇺🇸',
  olam: '🇸🇬',
}
const FAIXA_LABEL: Record<string, string> = {
  forte_baixa: 'Forte baixa',
  baixa: 'Baixa',
  estavel: 'Estável',
  alta: 'Alta',
  forte_alta: 'Forte alta',
}
const FAIXA_COR: Record<string, { bg: string; cor: string }> = {
  forte_baixa: { bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
  baixa:       { bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
  estavel:     { bg: '#F5F5F4', cor: COM_C.txtSub },
  alta:        { bg: COM_C.verdeLt, cor: COM_C.verde },
  forte_alta:  { bg: COM_C.verdeLt, cor: COM_C.verde },
}

function ImpactoBadge({ impacto }: { impacto: number }) {
  const cfg: Record<string, { label: string; bg: string; cor: string }> = {
    '2':  { label: 'Forte alta', bg: COM_C.verdeLt, cor: COM_C.verde },
    '1':  { label: 'Alta',       bg: COM_C.verdeLt, cor: COM_C.verde },
    '0':  { label: 'Neutro',     bg: '#F5F5F4', cor: COM_C.txtSub },
    '-1': { label: 'Baixa',      bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
    '-2': { label: 'Forte baixa',bg: COM_C.vermelhoLt, cor: COM_C.vermelho },
  }
  const c = cfg[String(impacto)] ?? cfg['0']
  return <Badge label={c.label} bg={c.bg} cor={c.cor} />
}

function FaixaBadge({ faixa }: { faixa: string }) {
  const c = FAIXA_COR[faixa] ?? FAIXA_COR.estavel
  return <Badge label={FAIXA_LABEL[faixa] ?? faixa} bg={c.bg} cor={c.cor} />
}

const secLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: COM_C.txtSub, marginBottom: 14,
}

export function PainelMercadoClient({
  snapshot, historico, sinais, cotacoes,
  ultimasCotacoesOrg, precoBahia, usdBrl, orgId,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [moageiraSel, setMoageiraSel] = useState('barry_callebaut')
  const [precoInput, setPrecoInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [filtroNoticia, setFiltroNoticia] = useState('todas')

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const precoBahiaVal = precoBahia?.preco_brl ? Number(precoBahia.preco_brl) : null

  const calcDeságio = (preco: number) => {
    if (!precoBahiaVal) return null
    return (((preco - precoBahiaVal) / precoBahiaVal) * 100).toFixed(1)
  }

  const melhorOferta = () => {
    const m = cotacoes.filter(c => ['barry_callebaut','cargill','olam'].includes(c.fonte) && c.preco_brl)
    if (!m.length) return '—'
    const melhor = m.reduce((a, b) => Number(a.preco_brl) > Number(b.preco_brl) ? a : b)
    return `${NOME_MOAGEIRA[melhor.fonte]} · R$ ${Number(melhor.preco_brl).toFixed(2)}`
  }

  const deságioMedio = () => {
    if (!precoBahiaVal) return '—'
    const m = cotacoes.filter(c => ['barry_callebaut','cargill','olam'].includes(c.fonte) && c.preco_brl)
    if (!m.length) return '—'
    const media = m.reduce((a, b) => a + Number(b.preco_brl), 0) / m.length
    return `${(((media - precoBahiaVal) / precoBahiaVal) * 100).toFixed(1)}% vs. mercado`
  }

  const handleRegistrar = () => {
    const preco = parseFloat(precoInput.replace(',', '.'))
    if (isNaN(preco) || preco <= 0) return
    setSalvando(true)
    startTransition(async () => {
      try {
        await registrarCotacaoMoageira({
          moageira: moageiraSel as 'barry_callebaut' | 'cargill' | 'olam',
          preco_brl: preco,
        })
        setPrecoInput('')
      } finally {
        setSalvando(false)
      }
    })
  }

  const sinaisFiltrados = sinais.filter(s =>
    s.titulo && (filtroNoticia === 'todas' || s.dimensao === filtroNoticia)
  )

  const kpis = [
    {
      label: 'Índice Nex',
      value: snapshot ? String(Math.round(snapshot.score_final)) : '—',
      sub: snapshot ? FAIXA_LABEL[snapshot.faixa] : 'Sem dados',
      cor: COM_C.marrom, corLt: COM_C.laranjaLt, icon: 'ti-chart-line',
    },
    {
      label: 'Mercado Bahia',
      value: precoBahiaVal ? `R$ ${precoBahiaVal.toFixed(2)}` : '—',
      sub: 'por arroba · precodocacau.com.br',
      cor: COM_C.verde, corLt: COM_C.verdeLt, icon: 'ti-plant',
    },
    {
      label: 'USD / BRL',
      value: usdBrl?.preco_brl ? `R$ ${Number(usdBrl.preco_brl).toFixed(2)}` : '—',
      sub: 'Banco Central do Brasil',
      cor: COM_C.azul, corLt: COM_C.azulLt, icon: 'ti-currency-dollar',
    },
    {
      label: 'Melhor moageira',
      value: (() => {
        const m = cotacoes.filter(c => ['barry_callebaut','cargill','olam'].includes(c.fonte) && c.preco_brl)
        if (!m.length) return '—'
        const melhor = m.reduce((a, b) => Number(a.preco_brl) > Number(b.preco_brl) ? a : b)
        return `R$ ${Number(melhor.preco_brl).toFixed(2)}`
      })(),
      sub: melhorOferta().split('·')[0].trim(),
      cor: COM_C.roxo, corLt: COM_C.roxoLt, icon: 'ti-building-factory',
    },
    {
      label: 'Último praticado',
      value: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) : '—',
      sub: 'cooperado · última cotação',
      cor: COM_C.txtSub, corLt: '#F5F5F4', icon: 'ti-users',
    },
    {
      label: 'Sinais hoje',
      value: String(sinais.length),
      sub: `${sinais.filter(s => s.impacto > 0).length} de alta · ${sinais.filter(s => s.impacto < 0).length} de baixa`,
      cor: COM_C.marrom, corLt: COM_C.laranjaLt, icon: 'ti-radar',
    },
  ]

  const filtros = ['todas', 'oferta', 'demanda', 'macro', 'financeiro'] as const

  return (
    <PageLayout
      titulo="Painel de mercado"
      subtitulo="Índice Nex — cacau"
      icone="ti-chart-line"
      breadcrumb={[{ label: 'Painel de mercado' }]}
      acoes={
        <>
          {snapshot && <FaixaBadge faixa={snapshot.faixa} />}
          <span style={{ fontSize: 11, color: COM_C.txtSub }}>
            {snapshot
              ? `Atualizado às ${new Date(snapshot.calculado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Nunca atualizado'}
          </span>
          <Btn
            variante="marrom-outline"
            icone="ti-refresh"
            onClick={() => startTransition(async () => { await atualizarIndiceNex(orgId) })}
            disabled={isPending}
          >
            {isPending ? 'Atualizando…' : 'Atualizar agora'}
          </Btn>
        </>
      }
    >
      {/* KPI cards */}
      <div className="com-kpi-grid">
        {kpis.map(({ label, value, sub, cor, corLt, icon }) => (
          <KpiCard key={label} label={label} value={value} sub={sub} icon={icon} cor={cor} corLt={corLt} />
        ))}
      </div>

      {/* Banner Índice Nex */}
      <div style={{
        background: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: 14,
        padding: '20px 22px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ ...secLabel, color: '#185FA5', marginBottom: 6 }}>Índice Nex</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: '#042C53', lineHeight: 1 }}>
              {snapshot ? Math.round(snapshot.score_final) : '—'}
              <span style={{ fontSize: 18, color: '#185FA5', fontWeight: 400 }}> / 100</span>
            </div>
            <div style={{ marginTop: 8 }}>
              {snapshot ? <FaixaBadge faixa={snapshot.faixa} /> : <span style={{ fontSize: 12, color: '#185FA5' }}>Clique em atualizar</span>}
            </div>
          </div>
          <div>
            <div style={{ ...secLabel, color: '#185FA5' }}>Probabilidades</div>
            {([
              { label: 'Forte alta', pct: snapshot?.prob_forte_alta ?? 0, cor: '#0F6E56' },
              { label: 'Alta',       pct: snapshot?.prob_alta ?? 0,       cor: '#1D9E75' },
              { label: 'Estável',    pct: snapshot?.prob_estavel ?? 0,    cor: COM_C.txtSub },
              { label: 'Baixa',      pct: snapshot?.prob_baixa ?? 0,      cor: COM_C.vermelho },
            ] as const).map(({ label, pct, cor }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#185FA5', width: 64, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(24,95,165,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: cor }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#042C53', width: 32, textAlign: 'right' }}>{pct}%</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ ...secLabel, color: '#185FA5' }}>Dimensões</div>
            {snapshot && ([
              { nome: 'Oferta mundial',   score: snapshot.score_oferta,     peso: '40%' },
              { nome: 'Demanda mundial',  score: snapshot.score_demanda,    peso: '30%' },
              { nome: 'Merc. financeiro', score: snapshot.score_financeiro, peso: '20%' },
              { nome: 'Macroeconomia',    score: snapshot.score_macro,      peso: '10%' },
            ] as const).map(({ nome, score, peso }) => (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#185FA5', width: 100, flexShrink: 0 }}>{nome}</span>
                <div style={{ width: 80, height: 5, background: 'rgba(24,95,165,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${score ?? 50}%`, height: '100%', borderRadius: 3, background: '#185FA5' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#042C53', width: 22, textAlign: 'right' }}>{score ?? '—'}</span>
                <span style={{ fontSize: 10, color: '#185FA599', width: 28, textAlign: 'right' }}>{peso}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Histórico + Notícias */}
      <div className="com-chart-row" style={{ marginBottom: 16 }}>
        <ContentCard title="Histórico do Índice Nex">
          {historico.length > 0 ? (
            <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Data', 'Score', 'Faixa'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '4px 0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...historico].reverse().slice(0, 14).map((h, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, color: COM_C.txtSub, padding: '7px 0' }}>
                      {new Date(h.calculado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td style={{ fontSize: 14, fontWeight: 700, textAlign: 'right', padding: '7px 0' }}>
                      {Math.round(h.score_final)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '7px 0' }}>
                      <FaixaBadge faixa={h.faixa} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: COM_C.txtSub, fontSize: 13 }}>
              Sem histórico ainda.<br />
              <span style={{ fontSize: 12 }}>O índice acumula a cada atualização.</span>
            </div>
          )}
        </ContentCard>

        <ContentCard
          title="Notícias relevantes"
          action={
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {filtros.map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroNoticia(f)}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontWeight: 500,
                    border: `1px solid ${filtroNoticia === f ? COM_C.marrom : COM_C.borda}`,
                    background: filtroNoticia === f ? COM_C.marrom : 'transparent',
                    color: filtroNoticia === f ? '#fff' : COM_C.txtSub,
                  }}
                >
                  {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          }
        >
          {sinaisFiltrados.length > 0 ? sinaisFiltrados.map((sinal, i, arr) => (
            <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < arr.length - 1 ? `1px solid ${COM_C.borda}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <ImpactoBadge impacto={sinal.impacto} />
                <span style={{ fontSize: 11, color: COM_C.txtSub, textTransform: 'capitalize' }}>{sinal.dimensao}</span>
                <span style={{ fontSize: 11, color: COM_C.txtSub, marginLeft: 'auto' }}>
                  {new Date(sinal.coletado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 13, color: COM_C.txt, lineHeight: 1.45, marginBottom: 4 }}>{sinal.titulo}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: COM_C.txtSub }}>{sinal.fonte}</span>
                {sinal.url && (
                  <a href={sinal.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: COM_C.azul, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                    ler artigo <i className="ti ti-external-link" style={{ fontSize: 12 }} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: COM_C.txtSub, fontSize: 13 }}>
              {filtroNoticia === 'todas'
                ? 'Sem notícias. Clique em "Atualizar agora".'
                : `Sem notícias para "${filtroNoticia}".`}
            </div>
          )}
        </ContentCard>
      </div>

      {/* Moageiras + Histórico org */}
      <div className="com-two-col" style={{ marginBottom: 16 }}>
        <ContentCard
          title="Oferta das moageiras"
          action={<Badge label="manual" bg="#FAEEDA" cor="#854F0B" />}
        >
          <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Empresa', 'Oferta /arroba', 'Deságio'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '4px 0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['barry_callebaut', 'cargill', 'olam'].map(fonte => {
                const cot = cotacoes.find(c => c.fonte === fonte)
                const deságio = cot?.preco_brl ? calcDeságio(Number(cot.preco_brl)) : null
                return (
                  <tr key={fonte}>
                    <td style={{ padding: '8px 0' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{NOME_MOAGEIRA[fonte]}</div>
                      <div style={{ fontSize: 11, color: COM_C.txtSub }}>
                        {BANDEIRA[fonte]}{cot ? ` · ${new Date(cot.data_referencia).toLocaleDateString('pt-BR')}` : ''}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 0' }}>
                      {cot?.preco_brl
                        ? <span style={{ fontSize: 14, fontWeight: 700, color: COM_C.marrom }}>R$ {Number(cot.preco_brl).toFixed(2)}</span>
                        : <span style={{ fontSize: 13, color: COM_C.txtSub }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 0' }}>
                      {deságio
                        ? <span style={{ fontSize: 12, fontWeight: 600, color: COM_C.vermelho }}>{deságio}%</span>
                        : <span style={{ fontSize: 12, color: COM_C.txtSub }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Select value={moageiraSel} onChange={e => setMoageiraSel(e.target.value)} style={{ flex: 1 }}>
              <option value="barry_callebaut">Barry Callebaut</option>
              <option value="cargill">Cargill</option>
              <option value="olam">Olam / OFI</option>
            </Select>
            <Input type="text" placeholder="R$/arroba" value={precoInput} onChange={e => setPrecoInput(e.target.value)}
              style={{ width: 110, textAlign: 'right' }} />
            <Btn variante="marrom-outline" onClick={handleRegistrar} disabled={salvando || !precoInput}>
              {salvando ? '…' : 'Registrar'}
            </Btn>
          </div>
        </ContentCard>

        <ContentCard
          title="Praticado pela cooperativa"
          action={<Badge label="cotações" bg={COM_C.roxoLt} cor={COM_C.roxo} />}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: COM_C.bg, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: COM_C.txtSub, marginBottom: 4 }}>Último cooperado</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: COM_C.roxo }}>
                {ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) : '—'}
              </div>
            </div>
            <div style={{ background: COM_C.bg, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: COM_C.txtSub, marginBottom: 4 }}>Último externo</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: COM_C.marrom }}>
                {ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_externo) : '—'}
              </div>
            </div>
          </div>
          {ultimasCotacoesOrg.length > 0 ? ultimasCotacoesOrg.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${COM_C.borda}` }}>
              <span style={{ fontSize: 12, color: COM_C.txtSub, width: 48 }}>
                {new Date(c.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
              <span style={{ fontSize: 12, flex: 1, padding: '0 10px' }}>{c.obs ?? '—'}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: COM_C.roxo }}>{fmt(c.preco_cooperado)}</span>
                <span style={{ fontSize: 11, color: COM_C.txtSub }}> / {fmt(c.preco_externo)}</span>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '1rem 0', color: COM_C.txtSub, fontSize: 13 }}>
              Nenhuma cotação registrada.
            </div>
          )}
        </ContentCard>
      </div>

      {/* Contexto + Configurações */}
      <div className="com-two-col">
        <ContentCard title="Contexto de mercado">
          {[
            { label: 'Deságio médio moageiras', valor: deságioMedio(), cor: COM_C.vermelho },
            { label: 'Melhor oferta hoje',       valor: melhorOferta(), cor: COM_C.txt },
            { label: 'Último praticado (coop.)', valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) + '/arr.' : '—', cor: COM_C.roxo },
            { label: 'Último praticado (ext.)',  valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_externo) + '/arr.' : '—', cor: COM_C.marrom },
            { label: 'Sinais coletados hoje',    valor: String(sinais.length), cor: COM_C.txt },
            { label: 'Sinais de alta',           valor: String(sinais.filter(s => s.impacto > 0).length), cor: COM_C.verde },
            { label: 'Sinais de baixa',          valor: String(sinais.filter(s => s.impacto < 0).length), cor: COM_C.vermelho },
          ].map(({ label, valor, cor }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${COM_C.borda}` }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>{valor}</span>
            </div>
          ))}
        </ContentCard>

        <ContentCard
          title="Configurações do índice"
          action={
            <a href="/comercializacao/painel/config" style={{ fontSize: 12, color: COM_C.azul, textDecoration: 'none', fontWeight: 600 }}>
              Editar →
            </a>
          }
        >
          {[
            { label: 'Peso oferta mundial',   valor: '40%' },
            { label: 'Peso demanda mundial',  valor: '30%' },
            { label: 'Peso merc. financeiro', valor: '20%' },
            { label: 'Peso macroeconomia',    valor: '10%' },
          ].map(({ label, valor }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${COM_C.borda}` }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{valor}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '10px 14px', background: COM_C.bg, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COM_C.txtSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Fontes ativas</div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              precodocacau.com.br · BCB · Google News RSS · ICCO · NOAA CPC · CFTC
            </div>
          </div>
        </ContentCard>
      </div>

      <div style={{ fontSize: 11, color: COM_C.txtSub, textAlign: 'center', marginTop: 24 }}>
        Fontes: BCB · precodocacau.com.br · ICCO · Google News RSS · NOAA CPC · análise automática via Claude Haiku · 1×/dia
      </div>
    </PageLayout>
  )
}