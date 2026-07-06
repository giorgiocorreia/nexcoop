'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/* ── Dados de demonstração (boletim ANPC 06/07/2026) ─────────────────────── */

const ICE = {
  contrato: 'SET/26',
  preco: 5628,
  variacao: 592,
  variacaoPct: 11.76,
  abertura: 5152,
  maxima: 5679,
  minima: 5152,
  fechamentoAnterior: 5036,
  min52s: 2846,
  max52s: 8950,
  variacao1ano: -37.83,
  fonte: 'ICE US Cocoa Futures · via Yahoo Finance (CC=F)',
}

const CAMBIO = { valor: 5.49, variacao: 0.06, variacaoPct: 1.11 }

const PARAMS = {
  desagioPct: 25.57,
  frete: 350,
  custos: 500,
  referenciaCargill: 'Cargill — Medicilândia (certificado)',
}

const HISTORICO = [
  { data: '06/07/2026', ice: 5628, cambio: 5.49, referencia: 30897.72, desagio: 25.57, produtor: 23.0 },
  { data: '03/07/2026', ice: 5521, cambio: 5.43, referencia: 29958.03, desagio: 25.53, produtor: 22.8 },
  { data: '30/06/2026', ice: 5311, cambio: 5.4, referencia: 28679.4, desagio: 25.63, produtor: 22.6 },
  { data: '27/06/2026', ice: 5204, cambio: 5.39, referencia: 28052.56, desagio: 25.55, produtor: 22.3 },
]

const INTRADAY = [
  { hora: '05:45', preco: 5075 },
  { hora: '06:30', preco: 5180 },
  { hora: '07:15', preco: 5240 },
  { hora: '08:00', preco: 5310 },
  { hora: '08:45', preco: 5380 },
  { hora: '09:30', preco: 5490 },
  { hora: '10:15', preco: 5560 },
  { hora: '11:00', preco: 5628 },
]

const fmtUsd = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const fmtBrl = (v: number, dec = 2) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: dec, maximumFractionDigits: dec })

function calcularPrecos() {
  const referencia = ICE.preco * CAMBIO.valor
  const desagioValor = referencia * (PARAMS.desagioPct / 100)
  const produtorTon = referencia - desagioValor - PARAMS.frete - PARAMS.custos
  const produtorKg = produtorTon / 1000
  return { referencia, desagioValor, produtorTon, produtorKg }
}

function SecaoNum({ n, titulo }: { n: number; titulo: string }) {
  return (
    <div className="boletim-secao-titulo">
      <span className="boletim-secao-num">{n}</span>
      <h2>{titulo}</h2>
    </div>
  )
}

function Variacao({ valor, pct, invertido }: { valor: number; pct: number; invertido?: boolean }) {
  const alta = valor >= 0
  const cor = invertido ? (alta ? '#B91C1C' : '#15803D') : alta ? '#15803D' : '#B91C1C'
  const seta = alta ? '▲' : '▼'
  return (
    <span className="boletim-var" style={{ color: cor }}>
      {seta} {Math.abs(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
      {' '}({alta ? '+' : ''}{pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)
    </span>
  )
}

export function BoletimCacauPreview() {
  const [agora, setAgora] = useState<Date | null>(null)
  const precos = useMemo(() => calcularPrecos(), [])

  useEffect(() => {
    setAgora(new Date())
    const id = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const dataExibicao = agora
    ? agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '06/07/2026'
  const horaExibicao = agora
    ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '11:58'

  return (
    <div className="boletim-root">
      <style>{`
        .boletim-root {
          --verde: #1B5E20;
          --verde-lt: #E8F5E9;
          --verde-md: #2E7D32;
          --marrom: #5D4037;
          --marrom-lt: #EFEBE9;
          --ouro: #F9A825;
          --bg: #F4F7F4;
          --card: #FFFFFF;
          --txt: #1A2E1A;
          --txt-sub: #5C6B5C;
          --borda: #C8E6C9;
          min-height: 100vh;
          background: var(--bg);
          padding: 0 0 48px;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          color: var(--txt);
        }
        .boletim-aviso {
          background: linear-gradient(90deg, #E65100, #F57C00);
          color: #fff;
          text-align: center;
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .boletim-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 20px 0;
        }
        .boletim-header {
          background: linear-gradient(135deg, var(--verde) 0%, #2E7D32 55%, #388E3C 100%);
          border-radius: 20px;
          padding: 28px 32px;
          color: #fff;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 20px;
          align-items: center;
          box-shadow: 0 8px 32px rgba(27, 94, 32, 0.25);
          margin-bottom: 20px;
        }
        .boletim-logo {
          width: 72px;
          height: 72px;
          background: rgba(255,255,255,0.15);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
        }
        .boletim-header h1 {
          margin: 0;
          font-size: clamp(22px, 4vw, 32px);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .boletim-header .sub {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.9;
          font-weight: 500;
        }
        .boletim-data-box {
          text-align: right;
          background: rgba(0,0,0,0.15);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .boletim-data-box .lbl { font-size: 10px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.08em; }
        .boletim-data-box .val { font-size: 18px; font-weight: 700; margin-top: 2px; }
        .boletim-data-box .upd { font-size: 11px; opacity: 0.8; margin-top: 4px; }
        .boletim-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .boletim-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
        .boletim-card {
          background: var(--card);
          border: 1px solid var(--borda);
          border-radius: 16px;
          padding: 22px 24px;
          box-shadow: 0 2px 12px rgba(27, 94, 32, 0.06);
        }
        .boletim-card--full { margin-bottom: 16px; }
        .boletim-secao-titulo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .boletim-secao-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--verde);
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .boletim-secao-titulo h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--verde);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .boletim-preco-grande {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 800;
          color: var(--verde-md);
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .boletim-preco-unidade { font-size: 14px; color: var(--txt-sub); font-weight: 500; margin-top: 4px; }
        .boletim-var { font-size: 15px; font-weight: 700; display: block; margin-top: 8px; }
        .boletim-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-top: 16px; }
        .boletim-kv div { font-size: 12px; }
        .boletim-kv .k { color: var(--txt-sub); }
        .boletim-kv .v { font-weight: 700; text-align: right; }
        .boletim-chart { height: 200px; margin-top: 8px; }
        .boletim-cambio-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--verde-lt);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 12px;
        }
        .boletim-calculo {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .boletim-calculo-linha {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--bg);
          border-radius: 10px;
          font-size: 14px;
        }
        .boletim-calculo-linha.neg { color: #B91C1C; }
        .boletim-calculo-linha.destaque {
          background: linear-gradient(135deg, var(--verde-lt), #C8E6C9);
          border: 2px solid var(--verde-md);
          font-weight: 700;
          font-size: 16px;
          padding: 16px 18px;
        }
        .boletim-produtor-box {
          margin-top: 16px;
          background: linear-gradient(135deg, #1B5E20, #2E7D32);
          border-radius: 14px;
          padding: 20px 24px;
          color: #fff;
          text-align: center;
        }
        .boletim-produtor-box .lbl {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.85;
        }
        .boletim-produtor-box .preco {
          font-size: clamp(32px, 6vw, 48px);
          font-weight: 900;
          margin: 6px 0 2px;
          letter-spacing: -0.03em;
        }
        .boletim-produtor-box .ref { font-size: 11px; opacity: 0.75; margin-top: 8px; }
        .boletim-tabela { width: 100%; border-collapse: collapse; font-size: 12px; }
        .boletim-tabela th {
          text-align: left;
          padding: 10px 8px;
          background: var(--verde-lt);
          color: var(--verde);
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 2px solid var(--borda);
        }
        .boletim-tabela td {
          padding: 11px 8px;
          border-bottom: 1px solid #E8F5E9;
        }
        .boletim-tabela tr:last-child td { border-bottom: none; font-weight: 700; background: #F1F8E9; }
        .boletim-tabela .num { text-align: right; font-variant-numeric: tabular-nums; }
        .boletim-monitor {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        .boletim-monitor-item {
          text-align: center;
          padding: 16px 10px;
          background: var(--bg);
          border-radius: 12px;
          border: 1px solid var(--borda);
        }
        .boletim-monitor-item .ico { font-size: 28px; margin-bottom: 8px; }
        .boletim-monitor-item .tit { font-size: 11px; font-weight: 700; color: var(--verde); line-height: 1.3; }
        .boletim-monitor-item .desc { font-size: 10px; color: var(--txt-sub); margin-top: 4px; line-height: 1.35; }
        .boletim-analise {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .boletim-analise-box {
          border-radius: 12px;
          padding: 18px;
          border-left: 4px solid;
        }
        .boletim-analise-box.curto { background: #E8F5E9; border-color: #2E7D32; }
        .boletim-analise-box.medio { background: #FFF8E1; border-color: #F9A825; }
        .boletim-analise-box.longo { background: #E3F2FD; border-color: #1565C0; }
        .boletim-analise-box h3 { margin: 0 0 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
        .boletim-analise-box p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--txt); }
        .boletim-resumo {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .boletim-resumo-item {
          background: var(--bg);
          border-radius: 10px;
          padding: 14px;
          text-align: center;
        }
        .boletim-resumo-item .k { font-size: 10px; color: var(--txt-sub); text-transform: uppercase; letter-spacing: 0.06em; }
        .boletim-resumo-item .v { font-size: 18px; font-weight: 800; color: var(--verde-md); margin-top: 4px; }
        .boletim-resumo-item.destaque .v { font-size: 22px; color: var(--verde); }
        .boletim-footer {
          margin-top: 24px;
          text-align: center;
          padding: 20px;
          background: var(--marrom-lt);
          border-radius: 14px;
          border: 1px solid #D7CCC8;
        }
        .boletim-footer p { margin: 0; font-size: 13px; color: var(--marrom); font-weight: 600; }
        .boletim-footer small { display: block; margin-top: 8px; font-size: 11px; color: var(--txt-sub); font-weight: 400; }
        .boletim-voltar {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 16px;
          font-size: 13px;
          color: var(--verde-md);
          text-decoration: none;
          font-weight: 600;
        }
        .boletim-voltar:hover { text-decoration: underline; }
        @media (max-width: 900px) {
          .boletim-header { grid-template-columns: 1fr; text-align: center; }
          .boletim-data-box { text-align: center; }
          .boletim-grid-2, .boletim-grid-3, .boletim-analise, .boletim-resumo { grid-template-columns: 1fr; }
          .boletim-monitor { grid-template-columns: repeat(2, 1fr); }
        }
        @media print {
          .boletim-aviso, .boletim-voltar { display: none; }
          .boletim-root { background: #fff; padding: 0; }
        }
      `}</style>

      <div className="boletim-aviso">
        Estrutura temporária — prévia visual · dados demonstrativos · não conectado a feeds ao vivo
      </div>

      <div className="boletim-wrap">
        <a href="/comercializacao" className="boletim-voltar">
          ← Voltar à comercialização
        </a>

        <header className="boletim-header">
          <div className="boletim-logo" aria-hidden>🌿</div>
          <div>
            <h1>Boletim do Mercado de Cacau</h1>
            <p className="sub">Informação transparente, produtor forte!</p>
          </div>
          <div className="boletim-data-box">
            <div className="lbl">Data</div>
            <div className="val">{dataExibicao}</div>
            <div className="upd">Atualização: {horaExibicao}</div>
          </div>
        </header>

        {/* 1 + 2: ICE e Câmbio */}
        <div className="boletim-grid-2">
          <div className="boletim-card">
            <SecaoNum n={1} titulo="Mercado internacional — Bolsa de Nova York (ICE US)" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--txt-sub)', marginBottom: 4 }}>
                  Contrato <strong>{ICE.contrato}</strong>
                </div>
                <div className="boletim-preco-grande">{fmtUsd(ICE.preco)}</div>
                <div className="boletim-preco-unidade">por tonelada</div>
                <Variacao valor={ICE.variacao} pct={ICE.variacaoPct} />
              </div>
            </div>
            <div className="boletim-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={INTRADAY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="iceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2E7D32" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2E7D32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
                  <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#5C6B5C' }} />
                  <YAxis domain={['dataMin - 50', 'dataMax + 50']} tick={{ fontSize: 10, fill: '#5C6B5C' }} width={48} />
                  <Tooltip
                    formatter={(v) => [fmtUsd(Number(v)), 'ICE']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #C8E6C9', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="preco" stroke="#1B5E20" strokeWidth={2.5} fill="url(#iceGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="boletim-kv">
              <div><span className="k">Abertura</span></div><div className="v">{fmtUsd(ICE.abertura)}</div>
              <div><span className="k">Máxima do dia</span></div><div className="v">{fmtUsd(ICE.maxima)}</div>
              <div><span className="k">Mínima do dia</span></div><div className="v">{fmtUsd(ICE.minima)}</div>
              <div><span className="k">Fechamento anterior</span></div><div className="v">{fmtUsd(ICE.fechamentoAnterior)}</div>
              <div><span className="k">Intervalo 52 sem.</span></div>
              <div className="v">{fmtUsd(ICE.min52s)} – {fmtUsd(ICE.max52s)}</div>
              <div><span className="k">Variação em 1 ano</span></div>
              <div className="v" style={{ color: '#B91C1C' }}>{ICE.variacao1ano}%</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--txt-sub)', marginTop: 12 }}>Fonte: {ICE.fonte}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="boletim-card" style={{ flex: 1 }}>
              <SecaoNum n={2} titulo="Câmbio" />
              <div className="boletim-cambio-icon" aria-hidden>💵</div>
              <div style={{ fontSize: 12, color: 'var(--txt-sub)' }}>Dólar comercial</div>
              <div className="boletim-preco-grande">R$ {CAMBIO.valor.toFixed(2)}</div>
              <Variacao valor={CAMBIO.variacao} pct={CAMBIO.variacaoPct} />
            </div>

            <div className="boletim-card" style={{ flex: 2 }}>
              <SecaoNum n={3} titulo="Preço de referência para o produtor" />
              <div className="boletim-calculo">
                <div className="boletim-calculo-linha">
                  <span>Cotação ICE US ({ICE.contrato})</span>
                  <strong>{fmtUsd(ICE.preco)}/t</strong>
                </div>
                <div className="boletim-calculo-linha">
                  <span>× Câmbio (R$/US$)</span>
                  <strong>{CAMBIO.valor.toFixed(2)}</strong>
                </div>
                <div className="boletim-calculo-linha destaque">
                  <span>Preço de referência (R$/t)</span>
                  <strong>{fmtBrl(precos.referencia, 2)}</strong>
                </div>
                <div className="boletim-calculo-linha neg">
                  <span>(−) Deságio médio ({PARAMS.desagioPct}%)</span>
                  <strong>−{fmtBrl(precos.desagioValor, 0)}</strong>
                </div>
                <div className="boletim-calculo-linha neg">
                  <span>(−) Frete médio</span>
                  <strong>−{fmtBrl(PARAMS.frete, 0)}</strong>
                </div>
                <div className="boletim-calculo-linha neg">
                  <span>(−) Custos e impostos (média)</span>
                  <strong>−{fmtBrl(PARAMS.custos, 0)}</strong>
                </div>
              </div>
              <div className="boletim-produtor-box">
                <div className="lbl">Preço estimado pago ao produtor certificado</div>
                <div className="preco">{fmtBrl(precos.produtorKg, 2)}/kg</div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  ou {fmtBrl(precos.produtorTon, 0)}/tonelada
                </div>
                <div className="ref">*Referência: {PARAMS.referenciaCargill}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4: Histórico */}
        <div className="boletim-card boletim-card--full">
          <SecaoNum n={4} titulo="Comparativo de preços recentes" />
          <div style={{ overflowX: 'auto' }}>
            <table className="boletim-tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th className="num">ICE US ({ICE.contrato}) US$/t</th>
                  <th className="num">Câmbio R$/US$</th>
                  <th className="num">Referência R$/t</th>
                  <th className="num">Deságio médio</th>
                  <th className="num">Produtor cert. R$/kg</th>
                </tr>
              </thead>
              <tbody>
                {HISTORICO.map((row, i) => (
                  <tr key={row.data}>
                    <td>{row.data}{i === 0 ? ' ★' : ''}</td>
                    <td className="num">{row.ice.toLocaleString('en-US')}</td>
                    <td className="num">{row.cambio.toFixed(2)}</td>
                    <td className="num">{row.referencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="num">−{row.desagio.toFixed(2)}%</td>
                    <td className="num" style={{ color: i === 0 ? '#1B5E20' : undefined, fontWeight: i === 0 ? 800 : 600 }}>
                      {row.produtor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: 'var(--txt-sub)', margin: '12px 0 0', fontStyle: 'italic' }}>
            O deságio é a principal razão pela qual o produtor não recebe integralmente a valorização da bolsa.
          </p>
        </div>

        {/* 5: Monitorar */}
        <div className="boletim-card boletim-card--full">
          <SecaoNum n={5} titulo="O que todo produtor deve acompanhar" />
          <div className="boletim-monitor">
            {[
              { ico: '📈', tit: 'ICE Nova York', desc: 'Referência internacional do preço' },
              { ico: '💱', tit: 'Dólar', desc: 'Impacta diretamente o preço em reais' },
              { ico: '📉', tit: 'Deságio da indústria', desc: 'Diferença entre referência e valor pago' },
              { ico: '🚛', tit: 'Frete e custos', desc: 'Influenciam o valor final recebido' },
              { ico: '✅', tit: 'Certificação', desc: 'Produtor certificado recebe melhor preço' },
            ].map(item => (
              <div key={item.tit} className="boletim-monitor-item">
                <div className="ico" aria-hidden>{item.ico}</div>
                <div className="tit">{item.tit}</div>
                <div className="desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 6: Análise */}
        <div className="boletim-card boletim-card--full">
          <SecaoNum n={6} titulo="Análise do mercado" />
          <div className="boletim-analise">
            <div className="boletim-analise-box curto">
              <h3>Curto prazo</h3>
              <p>
                Mercado muito volátil, reagindo às notícias sobre clima, doenças e logística na África.
                Alta de +11,76% hoje reflete tensão na oferta global.
              </p>
            </div>
            <div className="boletim-analise-box medio">
              <h3>Médio prazo</h3>
              <p>
                Tendência de preços sustentados na faixa entre US$ 4.500 e US$ 6.500/t,
                caso não haja recuperação forte da produção mundial.
              </p>
            </div>
            <div className="boletim-analise-box longo">
              <h3>Longo prazo</h3>
              <p>
                Demanda global em crescimento e oferta limitada por desafios climáticos e fitossanitários.
                Preços estruturalmente mais altos que antes de 2024.
              </p>
            </div>
          </div>
        </div>

        {/* 7: Resumo */}
        <div className="boletim-card boletim-card--full">
          <SecaoNum n={7} titulo="Resumo de hoje" />
          <div className="boletim-resumo">
            <div className="boletim-resumo-item">
              <div className="k">ICE US ({ICE.contrato})</div>
              <div className="v">{fmtUsd(ICE.preco)}/t</div>
            </div>
            <div className="boletim-resumo-item">
              <div className="k">Câmbio</div>
              <div className="v">R$ {CAMBIO.valor.toFixed(2)}</div>
            </div>
            <div className="boletim-resumo-item">
              <div className="k">Preço de referência</div>
              <div className="v">{fmtBrl(precos.referencia, 0)}/t</div>
            </div>
            <div className="boletim-resumo-item">
              <div className="k">Deságio médio</div>
              <div className="v">−{PARAMS.desagioPct}%</div>
            </div>
            <div className="boletim-resumo-item destaque" style={{ gridColumn: 'span 2' }}>
              <div className="k">Preço estimado pago ao produtor</div>
              <div className="v">{fmtBrl(precos.produtorKg, 2)}/kg</div>
            </div>
          </div>
        </div>

        <footer className="boletim-footer">
          <p>Informação transparente, mercado justo e cacau valorizado!</p>
          <small>
            Prévia NexCoop · Modelo inspirado no boletim ANPC · Dados demonstrativos de 06/07/2026
          </small>
        </footer>
      </div>
    </div>
  )
}