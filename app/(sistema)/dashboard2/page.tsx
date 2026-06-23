'use client'

import { useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import Link from 'next/link'

// ── Mock data ──────────────────────────────────────────────────────────────

const ORG = 'Cooperativa Agropecuária Serra Verde'

const TICKER = [
  { label: 'Fat. do Mês',    valor: 'R$ 847.320', delta: 12.4, up: true  as boolean | null },
  { label: 'A Receber',      valor: 'R$ 234.100', delta: 3.2,  up: false as boolean | null },
  { label: 'A Pagar',        valor: 'R$ 89.450',  delta: 8.1,  up: false as boolean | null },
  { label: 'Filiados',       valor: '342',         delta: 2.3,  up: true  as boolean | null },
  { label: 'Lotes Ativos',   valor: '8',           delta: null, up: null  as boolean | null },
  { label: 'Alertas',        valor: '12',          delta: null, up: null  as boolean | null, alert: true },
]

const LOTES = [
  { id: 'LOT-2024-018', produto: 'Cacau', qtd: '1.200 sc', valor: 'R$ 312.000', status: 'aberto',   data: '12/06' },
  { id: 'LOT-2024-017', produto: 'Cacau', qtd: '980 sc',   valor: 'R$ 254.800', status: 'fechado',  data: '08/06' },
  { id: 'LOT-2024-016', produto: 'Cacau', qtd: '2.100 sc', valor: 'R$ 546.000', status: 'nfe_ok',   data: '01/06' },
  { id: 'LOT-2024-015', produto: 'Cacau', qtd: '750 sc',   valor: 'R$ 195.000', status: 'entregue', data: '24/05' },
]

const VENDAS = [
  { num: 'V-8F2A1C', hora: '14:18', op: 'Carlos S.', forma: 'PIX',     total: 'R$ 234,50', cf: '#2563eb' },
  { num: 'V-7E9B3D', hora: '13:45', op: 'Carlos S.', forma: 'Espécie', total: 'R$ 89,00',  cf: '#16a34a' },
  { num: 'V-6D8C4E', hora: '12:30', op: 'Ana L.',    forma: 'Cartão',  total: 'R$ 512,00', cf: '#9333ea' },
  { num: 'V-5C7D5F', hora: '11:12', op: 'Ana L.',    forma: 'PIX',     total: 'R$ 178,30', cf: '#2563eb' },
]

const LANCAMENTOS = [
  { desc: 'Receita — Lote 017 Comercialização', valor: '+R$ 254.800', tipo: 'r', data: '10/06', pago: true  },
  { desc: 'Despesa — Frete lote 016',           valor: '-R$ 8.400',   tipo: 'd', data: '09/06', pago: true  },
  { desc: 'Receita — Anuidade cooperados',      valor: '+R$ 34.200',  tipo: 'r', data: '05/06', pago: true  },
  { desc: 'Despesa — Energia elétrica',         valor: '-R$ 3.820',   tipo: 'd', data: '03/06', pago: false },
  { desc: 'Receita — Vendas loja maio',         valor: '+R$ 42.300',  tipo: 'r', data: '01/06', pago: true  },
]

const INADIMPLENTES = [
  { nome: 'João Silva',    meses: 1, valor: 'R$ 450,00', venc: '01/06' },
  { nome: 'Maria Santos',  meses: 2, valor: 'R$ 900,00', venc: '15/05' },
  { nome: 'Pedro Costa',   meses: 1, valor: 'R$ 450,00', venc: '01/06' },
  { nome: 'Ana Oliveira',  meses: 1, valor: 'R$ 450,00', venc: '01/06' },
]

const ESTOQUE = [
  { nome: 'Sulfato de Cobre 1kg',   atual: 8,  min: 20, un: 'un', pct: 40 },
  { nome: 'NPK 10-10-10 50kg',      atual: 3,  min: 10, un: 'sc', pct: 30 },
  { nome: 'Fungicida Copper 500ml', atual: 12, min: 30, un: 'un', pct: 40 },
  { nome: 'Herbicida Glifosato 5L', atual: 5,  min: 15, un: 'L',  pct: 33 },
]

const CONFIG_MODULOS = [
  { label: 'Organização',      desc: 'CNPJ, endereço, plano',       href: '/organizacao',           icon: 'ti-building'           },
  { label: 'Usuários',         desc: 'Acesso e permissões',         href: '/configuracoes',          icon: 'ti-users-group'        },
  { label: 'Cooperados',       desc: 'Cadastro de filiados',        href: '/cooperados',             icon: 'ti-id-badge'           },
  { label: 'Produtos (Loja)',  desc: 'SKUs, preços, categorias',    href: '/loja/produtos',          icon: 'ti-tag'                },
  { label: 'Safras',           desc: 'Períodos de comercialização', href: '/comercializacao/safras', icon: 'ti-calendar-stats'     },
  { label: 'Plano de Contas',  desc: 'Categorias financeiras',      href: '/financeiro',             icon: 'ti-list-tree'          },
  { label: 'Documentos',       desc: 'Contratos e docs legais',     href: '/documentos',             icon: 'ti-files'              },
  { label: 'Assembleias',      desc: 'Convocações e atas',          href: '/assembleias',            icon: 'ti-building-community' },
  { label: 'Mensalidades',     desc: 'Cobranças recorrentes',       href: '/mensalidades',           icon: 'ti-calendar-repeat'    },
  { label: 'Escritório',       desc: 'Ferramentas contábeis',       href: '/escritorio',             icon: 'ti-briefcase'          },
  { label: 'Captação',         desc: 'Novos associados',            href: '/captacao',               icon: 'ti-user-search'        },
  { label: 'Configurações',    desc: 'Preferências do sistema',     href: '/configuracoes',          icon: 'ti-settings'           },
]

const TABS_DEF = [
  { id: 'geral',           label: 'Visão Geral'     },
  { id: 'comercializacao', label: 'Comercialização' },
  { id: 'loja',            label: 'Loja'            },
  { id: 'financeiro',      label: 'Financeiro'      },
  { id: 'associados',      label: 'Associados'      },
  { id: 'config',          label: 'Configurações'   },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function Delta({ v, up }: { v: number; up: boolean }) {
  const cor = up ? '#15803d' : '#dc2626'
  const bg  = up ? '#dcfce7' : '#fee2e2'
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: bg, color: cor }}>
      {up ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%
    </span>
  )
}

function LoteStatus({ s }: { s: string }) {
  const map: Record<string, [string, string, string]> = {
    aberto:   ['Aberto',   '#dcfce7', '#15803d'],
    fechado:  ['Fechado',  '#f3f4f6', '#6b7280'],
    nfe_ok:   ['NF-e OK',  '#dbeafe', '#1d4ed8'],
    entregue: ['Entregue', '#fef9c3', '#92400e'],
  }
  const [label, bg, cor] = map[s] ?? [s, '#f3f4f6', '#374151']
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: bg, color: cor }}>{label}</span>
}

function SecHead({ title, sub, href, hrefLabel }: { title: string; sub?: string; href?: string; hrefLabel?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e3dc' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#374151' }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
      </div>
      {href && <Link href={href} style={{ fontSize: 11, color: '#E07B30', textDecoration: 'none', fontWeight: 600 }}>{hrefLabel ?? 'Ver mais →'}</Link>}
    </div>
  )
}

function KpiStrip({ items }: { items: { label: string; valor: string; delta?: number | null; up?: boolean | null }[] }) {
  return (
    <div style={{ display: 'flex', background: '#fff', border: '1px solid #e5e3dc', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
      {items.map((k, i) => (
        <div key={i} style={{ flex: 1, padding: '12px 16px', borderLeft: i > 0 ? '1px solid #e5e3dc' : 'none' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 5 }}>{k.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', lineHeight: 1 }}>{k.valor}</div>
          {k.delta != null && k.up != null && (
            <div style={{ marginTop: 5 }}><Delta v={k.delta} up={k.up} /></div>
          )}
        </div>
      ))}
    </div>
  )
}

function Acoes({ items }: { items: { label: string; href: string; icon: string }[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 7, marginBottom: 16 }}>
      {items.map((a, i) => (
        <Link key={i} href={a.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: 4, textDecoration: 'none', fontSize: 12, color: '#374151', fontWeight: 500 }}>
          <i className={`ti ${a.icon}`} style={{ fontSize: 13 }} />{a.label}
        </Link>
      ))}
    </div>
  )
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 4, padding: 16, ...style }}>
      {children}
    </div>
  )
}

const TH: CSSProperties = { fontSize: 11, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600, padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #e5e3dc', letterSpacing: '0.04em' }
const TD: CSSProperties = { fontSize: 13, padding: '8px 12px', color: '#374151', borderBottom: '1px solid #f3f2ef' }

function Tabela({ cols, rows }: { cols: string[]; rows: ReactNode[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{cols.map((c, i) => <th key={i} style={TH}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 ? '#fafaf9' : '#fff' }}>
            {row.map((cell, j) => <td key={j} style={TD}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Sections ───────────────────────────────────────────────────────────────

function SGeral() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
        <Card>
          <SecHead title="Últimos Lançamentos" href="/financeiro" />
          <Tabela
            cols={['Descrição', 'Data', 'Valor', 'Status']}
            rows={LANCAMENTOS.map(l => [
              <span style={{ fontWeight: 500 }}>{l.desc}</span>,
              <span style={{ color: '#9ca3af' }}>{l.data}</span>,
              <span style={{ fontWeight: 600, color: l.tipo === 'r' ? '#15803d' : '#dc2626' }}>{l.valor}</span>,
              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 600, background: l.pago ? '#dcfce7' : '#fef9c3', color: l.pago ? '#15803d' : '#92400e' }}>
                {l.pago ? 'Pago' : 'Pendente'}
              </span>,
            ])}
          />
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <SecHead title="Inadimplência" sub="18 cooperados · R$ 8.100 em atraso" href="/cooperados" />
            <Tabela
              cols={['Cooperado', 'Meses', 'Valor']}
              rows={INADIMPLENTES.map(i => [
                <span style={{ fontWeight: 500 }}>{i.nome}</span>,
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: i.meses > 1 ? '#fee2e2' : '#fef9c3', color: i.meses > 1 ? '#dc2626' : '#92400e' }}>
                  {i.meses}x
                </span>,
                <span style={{ fontWeight: 600 }}>{i.valor}</span>,
              ])}
            />
          </Card>
          <Card>
            <SecHead title="Estoque Crítico" sub="5 produtos abaixo do mínimo" href="/loja/estoque" />
            {ESTOQUE.map((p, i) => (
              <div key={i} style={{ padding: '6px 0', borderTop: i > 0 ? '1px solid #f3f2ef' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{p.nome}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{p.atual}/{p.min} {p.un}</span>
                </div>
                <div style={{ height: 4, background: '#f3f2ef', borderRadius: 2 }}>
                  <div style={{ height: 4, width: `${p.pct}%`, background: p.pct < 35 ? '#dc2626' : '#f59e0b', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <Card style={{ marginTop: 14 }}>
        <SecHead title="Ações Rápidas" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {[
            { label: 'Novo filiado',      href: '/cooperados/novo',          icon: 'ti-user-plus'          },
            { label: 'Novo lançamento',   href: '/financeiro/novo',          icon: 'ti-plus'               },
            { label: 'Nova assembleia',   href: '/assembleias/nova',         icon: 'ti-building-community' },
            { label: 'Entrega grão',      href: '/comercializacao/entregas', icon: 'ti-truck-delivery'     },
            { label: 'Abrir lote',        href: '/comercializacao/lotes',    icon: 'ti-package'            },
            { label: 'PDV / Caixa',       href: '/loja/pdv',                 icon: 'ti-shopping-cart'      },
            { label: 'Novo documento',    href: '/documentos/novo',          icon: 'ti-file-plus'          },
            { label: 'Emitir NF-e',       href: '/comercializacao/lotes',    icon: 'ti-receipt'            },
          ].map((a, i) => (
            <Link key={i} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: 4, textDecoration: 'none', fontSize: 12, color: '#374151', fontWeight: 500 }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 14, color: '#E07B30' }} />
              {a.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SComercializacao() {
  return (
    <div>
      <KpiStrip items={[
        { label: 'Entregue (mês)', valor: '4.820 sc', delta: 8.2,  up: true  },
        { label: 'Lotes Abertos',  valor: '3',         delta: null            },
        { label: 'Valor Total',    valor: 'R$ 1,25M',  delta: 15.1, up: true  },
        { label: 'NF-e Emitidas',  valor: '12',        delta: null            },
      ]} />
      <Acoes items={[
        { label: 'Registrar entrega', href: '/comercializacao/entregas',    icon: 'ti-truck-delivery'   },
        { label: 'Abrir novo lote',   href: '/comercializacao/lotes',       icon: 'ti-package'          },
        { label: 'Emitir NF-e',       href: '/comercializacao/lotes',       icon: 'ti-receipt'          },
        { label: 'Contratos',         href: '/comercializacao/contratos',   icon: 'ti-file-certificate' },
        { label: 'Safras',            href: '/comercializacao/safras',      icon: 'ti-calendar'         },
        { label: 'Relatórios',        href: '/comercializacao',             icon: 'ti-chart-bar'        },
      ]} />
      <Card style={{ marginBottom: 14 }}>
        <SecHead title="Lotes" sub="Ordenado por data de abertura" href="/comercializacao/lotes" />
        <Tabela
          cols={['Lote', 'Produto', 'Qtd', 'Valor', 'Status', 'Data']}
          rows={LOTES.map(l => [
            <span style={{ fontWeight: 600, color: '#E07B30', fontSize: 12 }}>{l.id}</span>,
            l.produto,
            l.qtd,
            <span style={{ fontWeight: 600 }}>{l.valor}</span>,
            <LoteStatus s={l.status} />,
            <span style={{ color: '#9ca3af' }}>{l.data}</span>,
          ])}
        />
      </Card>
      <Card>
        <SecHead title="Entregas Pendentes de Lote" sub="Aguardando vinculação" href="/comercializacao/entregas" />
        <Tabela
          cols={['Produtor', 'Produto', 'Qtd', 'Entregue em']}
          rows={[
            ['Antônio Ferreira', 'Cacau', '120 sc', <span style={{ color: '#9ca3af' }}>18/06</span>],
            ['Fernanda Lima',    'Cacau', '85 sc',  <span style={{ color: '#9ca3af' }}>17/06</span>],
            ['Roberto Souza',    'Cacau', '200 sc', <span style={{ color: '#9ca3af' }}>15/06</span>],
          ]}
        />
      </Card>
    </div>
  )
}

function SLoja() {
  return (
    <div>
      <KpiStrip items={[
        { label: 'Vendas Hoje',   valor: 'R$ 1.847', delta: 22.3, up: true  },
        { label: 'Caixas',        valor: '2 abertos', delta: null            },
        { label: 'Ticket Médio',  valor: 'R$ 134',   delta: 4.1,  up: false },
        { label: 'Estoque Crit.', valor: '5 itens',  delta: null            },
      ]} />
      <Acoes items={[
        { label: 'Abrir PDV',    href: '/loja/pdv',              icon: 'ti-device-desktop'  },
        { label: 'Estoque',      href: '/loja/estoque',          icon: 'ti-packages'        },
        { label: 'Produtos',     href: '/loja/produtos',         icon: 'ti-tag'             },
        { label: 'Caixas',       href: '/loja/caixas',           icon: 'ti-cash-register'   },
        { label: 'Conferência',  href: '/loja/conferencia',      icon: 'ti-clipboard-check' },
        { label: 'Rel. Vendas',  href: '/loja/relatorio/vendas', icon: 'ti-chart-bar'       },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <SecHead title="Vendas de Hoje" href="/loja" hrefLabel="Ir para Loja →" />
          <Tabela
            cols={['Nº', 'Hora', 'Operador', 'Forma', 'Total']}
            rows={VENDAS.map(v => [
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>{v.num}</span>,
              v.hora,
              v.op,
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#f0f4ff', color: v.cf }}>{v.forma}</span>,
              <span style={{ fontWeight: 600 }}>{v.total}</span>,
            ])}
          />
        </Card>
        <Card>
          <SecHead title="Estoque Crítico" sub="Abaixo do mínimo" href="/loja/estoque" />
          {ESTOQUE.map((p, i) => (
            <div key={i} style={{ padding: '7px 0', borderTop: i > 0 ? '1px solid #f3f2ef' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{p.nome}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{p.atual}/{p.min} {p.un}</span>
              </div>
              <div style={{ height: 4, background: '#f3f2ef', borderRadius: 2 }}>
                <div style={{ height: 4, width: `${p.pct}%`, background: p.pct < 35 ? '#dc2626' : '#f59e0b', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

function SFinanceiro() {
  return (
    <div>
      <KpiStrip items={[
        { label: 'Saldo',           valor: 'R$ 312.400', delta: 5.8,  up: true  },
        { label: 'A Receber',       valor: 'R$ 234.100', delta: 3.2,  up: false },
        { label: 'A Pagar',         valor: 'R$ 89.450',  delta: 8.1,  up: false },
        { label: 'Resultado (mês)', valor: 'R$ 124.800', delta: 18.4, up: true  },
      ]} />
      <Acoes items={[
        { label: 'Novo lançamento',  href: '/financeiro/novo', icon: 'ti-plus'           },
        { label: 'A pagar',          href: '/financeiro',       icon: 'ti-calendar-minus' },
        { label: 'A receber',        href: '/financeiro',       icon: 'ti-calendar-plus'  },
        { label: 'Relatório',        href: '/financeiro',       icon: 'ti-chart-bar'      },
        { label: 'Cotas',            href: '/cooperados',       icon: 'ti-coin'           },
      ]} />
      <Card>
        <SecHead title="Lançamentos Recentes" href="/financeiro" />
        <Tabela
          cols={['Descrição', 'Data', 'Valor', 'Status']}
          rows={LANCAMENTOS.map(l => [
            <span style={{ fontWeight: 500 }}>{l.desc}</span>,
            <span style={{ color: '#9ca3af' }}>{l.data}</span>,
            <span style={{ fontWeight: 600, color: l.tipo === 'r' ? '#15803d' : '#dc2626' }}>{l.valor}</span>,
            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 600, background: l.pago ? '#dcfce7' : '#fef9c3', color: l.pago ? '#15803d' : '#92400e' }}>
              {l.pago ? 'Pago' : 'Pendente'}
            </span>,
          ])}
        />
      </Card>
    </div>
  )
}

function SAssociados() {
  return (
    <div>
      <KpiStrip items={[
        { label: 'Total',         valor: '342', delta: 2.3, up: true  },
        { label: 'Ativos',        valor: '284', delta: 1.1, up: true  },
        { label: 'Inadimplentes', valor: '18',  delta: 5.9, up: false },
        { label: 'Novos no Mês',  valor: '7',   delta: null           },
      ]} />
      <Acoes items={[
        { label: 'Novo filiado',   href: '/cooperados/novo', icon: 'ti-user-plus'          },
        { label: 'Lista completa', href: '/cooperados',       icon: 'ti-users'              },
        { label: 'Cotas',          href: '/cooperados',       icon: 'ti-coin'               },
        { label: 'Mensalidades',   href: '/mensalidades',     icon: 'ti-calendar'           },
        { label: 'Assembleias',    href: '/assembleias',      icon: 'ti-building-community' },
      ]} />
      <Card>
        <SecHead title="Inadimplentes" sub="18 cooperados · R$ 8.100 em atraso" href="/cooperados" />
        <Tabela
          cols={['Cooperado', 'Meses em atraso', 'Valor', 'Vencimento']}
          rows={INADIMPLENTES.map(i => [
            <span style={{ fontWeight: 600 }}>{i.nome}</span>,
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: i.meses > 1 ? '#fee2e2' : '#fef9c3', color: i.meses > 1 ? '#dc2626' : '#92400e' }}>
              {i.meses}x
            </span>,
            i.valor,
            <span style={{ color: '#dc2626', fontWeight: 500 }}>{i.venc}</span>,
          ])}
        />
      </Card>
    </div>
  )
}

function SConfig() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
      {CONFIG_MODULOS.map((m, i) => (
        <Link key={i} href={m.href} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', border: '1px solid #e5e3dc', borderRadius: 4, padding: '13px 15px', textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: '#fff7ed', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className={`ti ${m.icon}`} style={{ fontSize: 15, color: '#E07B30' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1917' }}>{m.label}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{m.desc}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function Dashboard2Page() {
  const [tab, setTab] = useState('geral')

  return (
    <div style={{ margin: '-2rem -2rem 0 -2rem' }}>
      <style>{`
        .d2tab { display:flex; align-items:center; height:42px; padding:0 18px; font-size:13px; font-weight:500; color:#78716c; border:none; border-bottom:2px solid transparent; background:none; cursor:pointer; font-family:inherit; white-space:nowrap; transition:color .15s,border-color .15s; }
        .d2tab:hover { color:#1c1917; }
        .d2tab.on { color:#E07B30; border-bottom-color:#E07B30; font-weight:600; }
      `}</style>

      {/* HEADER ESCURO */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#1c1917', height: 52, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, background: '#E07B30', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-building-community" style={{ fontSize: 14, color: '#fff' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>NexCoop</span>
          </div>
          <div style={{ width: 1, height: 18, background: '#ffffff22' }} />
          <span style={{ fontSize: 12, color: '#a8a29e' }}>{ORG}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#86efac', fontWeight: 500 }}>Sistema operacional</span>
          </div>
          <span style={{ fontSize: 11, color: '#57534e' }}>23/06/2026 · 14:32</span>
          <Link href="/perfil" style={{ width: 28, height: 28, borderRadius: '50%', background: '#292524', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <i className="ti ti-user" style={{ fontSize: 13, color: '#a8a29e' }} />
          </Link>
        </div>
      </div>

      {/* KPI TICKER STRIP */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e3dc', overflowX: 'auto' }}>
        <div style={{ display: 'flex', padding: '0 6px' }}>
          {TICKER.map((k, i) => (
            <div key={i} style={{ flexShrink: 0, padding: '10px 20px', borderRight: i < TICKER.length - 1 ? '1px solid #f3f2ef' : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: k.alert ? '#dc2626' : '#1c1917', lineHeight: 1 }}>{k.valor}</span>
                {k.delta !== null && k.up !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: k.up ? '#15803d' : '#dc2626' }}>
                    {k.up ? '▲' : '▼'} {k.delta.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BARRA DE TABS */}
      <div style={{ position: 'sticky', top: 52, zIndex: 99, background: '#fff', borderBottom: '1px solid #e5e3dc', overflowX: 'auto' }}>
        <div style={{ display: 'flex', padding: '0 6px' }}>
          {TABS_DEF.map(t => (
            <button key={t.id} className={`d2tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ background: '#f7f6f3', padding: '18px 20px', minHeight: 'calc(100vh - 140px)' }}>
        {tab === 'geral'           && <SGeral />}
        {tab === 'comercializacao' && <SComercializacao />}
        {tab === 'loja'            && <SLoja />}
        {tab === 'financeiro'      && <SFinanceiro />}
        {tab === 'associados'      && <SAssociados />}
        {tab === 'config'          && <SConfig />}
      </div>
    </div>
  )
}

