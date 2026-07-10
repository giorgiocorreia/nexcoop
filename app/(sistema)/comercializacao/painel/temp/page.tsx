// PREVIEW TEMPORARIO — nao entra no menu, nao alimenta o Indice Nex.
// Le a pagina de cacau do investing.com (CCc2, contrato Set/26) e mostra todos
// os indices que ela expoe, no visual do dashboard. Serve para decidir o que
// vale integrar de verdade. Apagar quando a decisao estiver tomada.
import {
  PageLayout, ContentCard, KpiCard, Badge, InfoRow, AlertBanner, COM_C,
} from '@/components/nexcoop/ui'
import { parseIndicesCacau, SINAL_LABEL, type IndicesCacau } from '@/lib/comercializacao/investing-utils'

export const revalidate = 300 // 5 min: nao martelar a origem a cada F5
const URL = 'https://br.investing.com/commodities/us-cocoa'

// O Cloudflare do investing.com responde 403 para IP de datacenter: direto da
// Vercel nunca passa, so de IP residencial. O leitor da jina.ai busca do lado
// dele e devolve o HTML cru — inclusive o __NEXT_DATA__ — se pedirmos
// X-Return-Format: html (o padrao dele e markdown, que perde o script).
type Origem = 'direto' | 'proxy'

async function baixar(): Promise<{ html: string; origem: Origem } | { erro: string }> {
  const tentativas: { origem: Origem; url: string; headers: Record<string, string> }[] = [
    {
      origem: 'direto',
      url: URL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    },
    {
      origem: 'proxy',
      url: `https://r.jina.ai/${URL}`,
      headers: { 'X-Return-Format': 'html' },
    },
  ]

  const falhas: string[] = []
  for (const t of tentativas) {
    try {
      const res = await fetch(t.url, {
        headers: t.headers,
        next: { revalidate },
        signal: AbortSignal.timeout(25000),
      })
      if (!res.ok) { falhas.push(`${t.origem}: HTTP ${res.status}`); continue }
      return { html: await res.text(), origem: t.origem }
    } catch (e) {
      falhas.push(`${t.origem}: ${String(e)}`)
    }
  }
  return { erro: falhas.join(' · ') }
}

async function carregar(): Promise<{ dados: IndicesCacau | null; origem: Origem | null; erro: string | null }> {
  const r = await baixar()
  if ('erro' in r) return { dados: null, origem: null, erro: r.erro }

  const dados = parseIndicesCacau(r.html)
  if (!dados) {
    return { dados: null, origem: r.origem, erro: `baixou via ${r.origem}, mas nao achei __NEXT_DATA__ ou o preco principal` }
  }
  return { dados, origem: r.origem, erro: null }
}

const usd = (v: number | null) =>
  v == null ? '—' : `US$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
const pct = (v: number | null) =>
  v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
const corPct = (v: number | null) =>
  v == null ? COM_C.txtSub : v > 0 ? COM_C.verdeTxt : v < 0 ? COM_C.vermelho : COM_C.txtSub

export default async function PainelTempPage() {
  const { dados, origem, erro } = await carregar()

  if (!dados) {
    return (
      <PageLayout titulo="Índices do cacau (preview)" icone="ti-chart-dots" breadcrumb={[{ label: 'Painel de mercado', href: '/comercializacao/painel' }, { label: 'Preview' }]}>
        <AlertBanner tipo="erro">
          Não consegui ler a origem. Tentativas — {erro}. O investing.com fica atrás de Cloudflare e
          recusa IP de datacenter; o proxy de leitura é o plano B, e ele também falhou.
        </AlertBanner>
      </PageLayout>
    )
  }

  const d = dados
  // CCc1 costuma vir com "last" fora do proprio bid/ask — numero furado na origem.
  const curvaSuspeita = d.curva.filter(
    c => c.last != null && c.bid != null && c.ask != null && (c.last < c.bid * 0.97 || c.last > c.ask * 1.03),
  )

  return (
    <PageLayout
      titulo="Índices do cacau (preview)"
      subtitulo={`${d.nome ?? 'Cacau NY'} · ${d.symbol ?? '—'} · contrato ${d.mesContrato ?? '—'}`}
      icone="ti-chart-dots"
      breadcrumb={[{ label: 'Painel de mercado', href: '/comercializacao/painel' }, { label: 'Preview' }]}
    >
      <AlertBanner tipo="info">
        <strong>Página temporária.</strong> Fonte: investing.com, lida do payload interno da página
        deles — não é API e pode quebrar sem aviso. O contrato é <strong>{d.symbol}</strong> ({d.mesContrato}),
        que <strong>não é o mês corrente</strong>: o Índice Nex hoje usa Julho/26 via precodocacau.
        {d.emTempoReal && ' Os dados vêm em tempo real, não atrasados — redistribuir exige licença.'}
        {d.atualizadoEm && ` Origem atualizada em ${new Date(d.atualizadoEm).toLocaleString('pt-BR')}.`}
      </AlertBanner>

      {curvaSuspeita.length > 0 && (
        <AlertBanner tipo="erro">
          {curvaSuspeita.map(c => c.symbol).join(', ')} traz <em>último</em> fora da própria faixa de
          bid/ask — valor furado na origem. Repassei como veio, sem corrigir, para você ver o problema.
        </AlertBanner>
      )}

      <div className="com-kpi-grid-4">
        <KpiCard label={`Último (${d.moeda}/${d.unidade ?? 't'})`} value={usd(d.ultimo)}
          sub={`${pct(d.variacaoPct)} no dia`} icon="ti-currency-dollar"
          cor={COM_C.marca} corLt={COM_C.marcaLt} />
        <KpiCard label="Variação no dia" value={pct(d.variacaoPct)}
          sub={d.variacao != null ? `${d.variacao > 0 ? '+' : ''}${d.variacao} pontos` : '—'}
          icon={d.variacaoPct != null && d.variacaoPct < 0 ? 'ti-trending-down' : 'ti-trending-up'}
          cor={d.variacaoPct != null && d.variacaoPct < 0 ? COM_C.vermelho : COM_C.verde}
          corLt={d.variacaoPct != null && d.variacaoPct < 0 ? COM_C.vermelhoLt : COM_C.verdeLt} />
        <KpiCard label="Volume" value={d.volume?.toLocaleString('pt-BR') ?? '—'}
          sub="Contratos no dia" icon="ti-chart-bar" cor={COM_C.azul} corLt={COM_C.azulLt} />
        <KpiCard label="Contratos em aberto" value={d.openInterest?.toLocaleString('pt-BR') ?? '—'}
          sub="Open interest" icon="ti-layers-intersect" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
      </div>

      <div className="com-chart-row">
        <ContentCard title="Sessão" subtitle="Preços do pregão corrente">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <InfoRow label="Abertura" valor={usd(d.abertura)} />
            <InfoRow label="Fechamento anterior" valor={usd(d.fechamentoAnterior)} />
            <InfoRow label="Máxima" valor={usd(d.maxima)} />
            <InfoRow label="Mínima" valor={usd(d.minima)} />
            <InfoRow label="Compra (bid)" valor={usd(d.bid)} />
            <InfoRow label="Venda (ask)" valor={usd(d.ask)} />
            <InfoRow label="Mínima 52 semanas" valor={usd(d.min52sem)} />
            <InfoRow label="Máxima 52 semanas" valor={usd(d.max52sem)} />
          </div>
        </ContentCard>

        <ContentCard title="Análise técnica" subtitle="Recomendação da origem por período">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.tecnico.map(t => {
              const s = SINAL_LABEL[t.sinal] ?? { label: t.sinal, bg: '#F1F5F9', cor: '#475569' }
              return (
                <div key={t.timeframe} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: COM_C.txtSub }}>{t.timeframe}</span>
                  <Badge label={s.label} bg={s.bg} cor={s.cor} dot />
                </div>
              )
            })}
          </div>
        </ContentCard>
      </div>

      <div className="com-two-col">
        <ContentCard title="Variação por período">
          {d.variacoes.map(v => (
            <div key={v.janela} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 0', borderBottom: `1px solid ${COM_C.borda}`,
            }}>
              <span style={{ fontSize: 12, color: COM_C.txtSub, fontWeight: 500 }}>{v.janela}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: corPct(v.pct), fontVariantNumeric: 'tabular-nums' }}>
                {pct(v.pct)}
              </span>
            </div>
          ))}
        </ContentCard>

        <ContentCard title="Ficha do contrato">
          {d.ficha.map(f => <InfoRow key={f.label} label={f.label} valor={f.valor} />)}
        </ContentCard>
      </div>

      <ContentCard title="Curva de vencimentos" subtitle="Contratos contínuos CCc1…CCc5 — a estrutura a termo" noPadding>
        <div style={{ overflowX: 'auto' }}>
          <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Contrato</th><th>Último</th><th>Compra</th><th>Venda</th><th>Variação</th><th>Atraso</th>
              </tr>
            </thead>
            <tbody>
              {d.curva.map(c => (
                <tr key={c.symbol}>
                  <td style={{ fontWeight: 600 }}>
                    {c.symbol}
                    {c.bolsa && <span style={{ fontSize: 11, color: COM_C.txtSub, marginLeft: 6 }}>{c.bolsa}</span>}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{usd(c.last)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{usd(c.bid)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{usd(c.ask)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: corPct(c.variacaoDiaPct), fontWeight: 600 }}>
                    {pct(c.variacaoDiaPct)}
                  </td>
                  <td>
                    <Badge
                      label={c.atrasado ? 'Atrasado' : 'Tempo real'}
                      bg={c.atrasado ? COM_C.laranjaLt : COM_C.verdeLt}
                      cor={c.atrasado ? COM_C.laranjaTxt : COM_C.verdeTxt}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>

      <p style={{ fontSize: 11, color: COM_C.txtSub, textAlign: 'center', marginTop: 16 }}>
        Preview interno · {URL} · revalida a cada {revalidate / 60} min ·{' '}
        {origem === 'proxy'
          ? 'lido via proxy r.jina.ai (Cloudflare recusa o IP do servidor)'
          : 'lido direto da origem'}
      </p>
    </PageLayout>
  )
}
