import Link from 'next/link'
import { getDashboardComercializacao } from '@/lib/comercializacao/dashboard'
import { getOrganizacaoId } from '@/lib/auth'

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtReal(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} t`
  return `${fmt(n)} kg`
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default async function ComercializacaoPage() {
  const organizacaoId = await getOrganizacaoId()
  const d = await getDashboardComercializacao(organizacaoId)

  const maxKg = Math.max(...d.entregasSemana.map((e) => e.totalKg), 1)
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: '#1a1a1a' }}>
            Comercialização
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Gestão completa do ciclo de comercialização
            </p>
            {d.sessaoAberta ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: '#dcfce7', color: '#14532d', fontWeight: 500,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                Caixa aberto
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: '#f3f4f6', color: '#6b7280', fontWeight: 500,
              }}>
                Caixa fechado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Métricas do dia */}
      <p style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Resumo do dia
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: '1.5rem' }}>
        {[
          {
            label: 'Entregas hoje',
            value: fmt(d.entregasHoje.count),
            sub: `${fmtKg(d.entregasHoje.totalKg)} recebidos`,
            accent: '#92400e',
          },
          {
            label: 'Saldo em caixa',
            value: d.sessaoAberta ? fmtReal(d.sessaoAberta.saldoCalculado) : '—',
            sub: d.sessaoAberta ? `Sessão aberta` : 'Sem sessão',
            accent: '#1D9E75',
          },
          {
            label: 'Produtores hoje',
            value: fmt(d.produtoresHoje),
            sub: `de ${fmt(d.totalProdutores)} cadastrados`,
            accent: '#635BFF',
          },
          {
            label: 'Lotes abertos',
            value: fmt(d.lotesAbertos),
            sub: 'aguardando venda',
            accent: '#E07B30',
          },
        ].map((m) => (
          <div key={m.label} style={{
            background: '#f9fafb',
            borderRadius: 8,
            padding: '14px 16px',
            borderLeft: `3px solid ${m.accent}`,
          }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>{m.label}</p>
            <p style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0, lineHeight: 1 }}>{m.value}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico + Sessão de caixa */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 12, marginBottom: '1.5rem' }}>

        {/* Gráfico de barras */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 14px', color: '#111827' }}>
            Entregas — últimos 7 dias
          </p>
          {d.entregasSemana.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>
              Nenhuma entrega registrada ainda.
            </p>
          ) : (
            d.entregasSemana.map((e) => {
              const pct = maxKg > 0 ? (e.totalKg / maxKg) * 100 : 0
              const isHoje = e.dia === hoje
              const diasDate = new Date(e.dia + 'T12:00:00')
              const label = isHoje ? 'hj' : DIAS_SEMANA[diasDate.getDay()]
              return (
                <div key={e.dia} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: isHoje ? '#111827' : '#6b7280', width: 22, textAlign: 'right', fontWeight: isHoje ? 500 : 400 }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#92400e', borderRadius: 4, opacity: isHoje ? 1 : 0.7 }} />
                  </div>
                  <span style={{ fontSize: 11, color: isHoje ? '#111827' : '#9ca3af', width: 60, fontWeight: isHoje ? 500 : 400 }}>
                    {fmtKg(e.totalKg)}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Sessão de caixa */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 14px', color: '#111827' }}>
            Sessão de caixa
          </p>
          {!d.sessaoAberta ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 12px' }}>Nenhuma sessão aberta</p>
              <Link href="/comercializacao/caixa" style={{
                display: 'inline-block', fontSize: 13, padding: '7px 16px',
                border: '1px solid #e5e3dc', borderRadius: 8, color: '#374151',
                textDecoration: 'none',
              }}>
                Abrir caixa
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Aportes', valor: d.sessaoAberta.aportes, positivo: true },
                { label: 'Sangrias', valor: d.sessaoAberta.sangrias, positivo: false },
              ].map((r) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{r.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: r.positivo ? '#1D9E75' : '#991b1b' }}>
                    {r.positivo ? '+' : '−'} {fmtReal(r.valor ?? 0)}
                  </span>
                </div>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid #e5e3dc', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Saldo atual</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>
                  {fmtReal(d.sessaoAberta.saldoCalculado)}
                </span>
              </div>
              <Link href="/comercializacao/caixa" style={{
                display: 'block', textAlign: 'center', fontSize: 13,
                padding: '8px', border: '1px solid #e5e3dc', borderRadius: 8,
                color: '#374151', textDecoration: 'none', marginTop: 4,
              }}>
                Ver caixa completo →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de últimas entregas */}
      {d.ultimasEntregas.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 14px', color: '#111827' }}>
            Últimas entregas
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Produtor', 'Produto', 'Kg', 'Valor', 'Horário'].map((h, i) => (
                  <th key={h} style={{
                    fontSize: 11, color: '#9ca3af', fontWeight: 400, textAlign: i >= 2 ? 'right' : 'left',
                    padding: '0 0 8px', borderBottom: '1px solid #e5e3dc',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.ultimasEntregas.map((e, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', color: '#111827' }}>{e.produtor}</td>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{e.produto}</td>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{fmtKg(e.kg)}</td>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#1D9E75', fontVariantNumeric: 'tabular-nums' }}>{fmtReal(e.valor)}</td>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#9ca3af' }}>{e.horario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Acesso rápido */}
      <p style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Acesso rápido
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
        {[
          { href: '/comercializacao/produtores', titulo: 'Produtores', sub: 'Cadastro e fichas', bg: '#fef3c7', cor: '#92400e' },
          { href: '/comercializacao/caixa', titulo: 'Caixa', sub: 'Recebimento e pagamentos', bg: '#f0fdf4', cor: '#1D9E75' },
        ].map((c) => (
          <Link key={c.href} href={c.href} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12,
            padding: '1rem 1.25rem', textDecoration: 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 18, color: c.cor }}>◈</span>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: '0 0 2px' }}>{c.titulo}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{c.sub}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
