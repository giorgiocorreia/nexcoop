'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  HubStyles, KpiCard, LinkCard, ContentCard, COM_C, HERO,
} from '@/components/nexcoop/ui'
import type { CustodiaUsuario } from '@/lib/tesouraria/saldo-responsabilidade'

interface LancamentoResumo {
  descricao: string
  valor: number
  tipo: string
  data_competencia: string
  status: string
}

interface AssembleiaResumo {
  titulo: string
  data_realizacao: string
  tipo: string
}

interface DocumentoResumo {
  nome: string
  data_validade: string | null
  categoria: string
}

interface ResumoCotas {
  totalAReceber: number
  totalVencido: number
  totalInadimplentes: number
  inadimplentes: { nome_completo: string }[]
}

interface Props {
  hoje: string
  totalCooperados: number
  cooperadosAtivos: number
  totalReceber: number
  totalPagar: number
  documentosVencendo: DocumentoResumo[]
  ultimosLancamentos: LancamentoResumo[]
  proximaAssembleia: AssembleiaResumo | null
  resumoCotas: ResumoCotas | null
  orgTipo: string | undefined
  indiceNex?: React.ReactNode
  custodia?: CustodiaUsuario[]
}

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const MODULOS = [
  { href: '/cooperados', label: 'Cooperados', desc: 'Cadastro, perfil, cotas e histórico dos filiados.', icon: 'ti-users', cor: COM_C.marca, corLt: COM_C.marcaLt },
  { href: '/mensalidades', label: 'Mensalidades', desc: 'Cobranças mensais, geração em lote e acompanhamento.', icon: 'ti-calendar-due', cor: COM_C.azul, corLt: COM_C.azulLt },
  { href: '/financeiro', label: 'Financeiro', desc: 'Receitas, despesas e lançamentos contábeis.', icon: 'ti-receipt-2', cor: COM_C.verde, corLt: COM_C.verdeLt },
  { href: '/assembleias', label: 'Assembleias', desc: 'AGO, AGE e reuniões de conselho.', icon: 'ti-users-group', cor: COM_C.azul, corLt: COM_C.azulLt },
  { href: '/documentos', label: 'Documentos', desc: 'Estatutos, atas, contratos e validades.', icon: 'ti-files', cor: COM_C.laranja, corLt: COM_C.laranjaLt },
  { href: '/comercializacao', label: 'Comercialização', desc: 'Caixa, lotes, NF-e e gestão do cacau.', icon: 'ti-plant-2', cor: COM_C.marrom, corLt: COM_C.marromLt },
]

const ACOES = [
  { label: 'Novo filiado', href: '/cooperados/novo', icon: 'ti-user-plus' },
  { label: 'Novo lançamento', href: '/financeiro/novo', icon: 'ti-plus' },
  { label: 'Nova assembleia', href: '/assembleias/nova', icon: 'ti-building-community' },
  { label: 'Novo documento', href: '/documentos/novo', icon: 'ti-file-plus' },
]

export default function DashboardClient({
  hoje,
  totalCooperados,
  cooperadosAtivos,
  totalReceber,
  totalPagar,
  documentosVencendo,
  ultimosLancamentos,
  proximaAssembleia,
  resumoCotas,
  orgTipo,
  indiceNex,
  custodia,
}: Props) {
  const router = useRouter()
  return (
    <>
      <HubStyles />

      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: HERO.bg,
        borderBottom: HERO.borda, margin: '0 -2rem 0 -2rem',
      }}>
        <div className="com-page-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: HERO.chip,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className="ti ti-layout-dashboard" style={{ fontSize: 20, color: HERO.txt }} />
              </div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: HERO.txt, letterSpacing: '-0.02em' }}>
                Dashboard
              </h1>
            </div>
            <div className="com-hub-date" style={{ color: HERO.txtSub }}>{hoje}</div>
          </div>
        </div>
      </div>

      <div className="com-hub-content">
        <div className="com-kpi-grid-4" style={{ marginBottom: resumoCotas ? 16 : 24 }}>
          <KpiCard label="Filiados" value={String(totalCooperados)} sub={`${cooperadosAtivos} ativos`}
            icon="ti-users" cor={COM_C.marca} corLt={COM_C.marcaLt}
            onClick={() => router.push('/cooperados')} />
          <KpiCard label="A receber" value={BRL(totalReceber)} sub="Lançamentos pendentes"
            icon="ti-arrow-down-left" cor={COM_C.azul} corLt={COM_C.azulLt}
            onClick={() => router.push('/financeiro?tipo=receita&status=pendente')} />
          <KpiCard label="A pagar" value={BRL(totalPagar)} sub="Lançamentos pendentes"
            icon="ti-arrow-up-right" cor={COM_C.vermelho} corLt={COM_C.vermelhoLt}
            onClick={() => router.push('/financeiro?tipo=despesa&status=pendente')} />
          <KpiCard label="Docs vencendo" value={String(documentosVencendo.length)} sub="Próximos 30 dias"
            icon="ti-alert-triangle" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
        </div>

        {resumoCotas && (
          <div className="com-kpi-grid-4" style={{ marginBottom: 24 }}>
            <KpiCard label="Capital a receber" value={BRL(resumoCotas.totalAReceber)}
              sub={resumoCotas.totalVencido > 0 ? `Vencido: ${BRL(resumoCotas.totalVencido)}` : 'Parcelas de cotas pendentes'}
              icon="ti-pig-money" cor={COM_C.azul} corLt={COM_C.azulLt} />
            <KpiCard label="Inadimplentes" value={String(resumoCotas.totalInadimplentes)}
              sub={resumoCotas.inadimplentes.length > 0
                ? resumoCotas.inadimplentes.slice(0, 2).map(c => c.nome_completo.split(' ').slice(0, 2).join(' ')).join(', ')
                : 'Nenhum cooperado inadimplente'}
              icon="ti-user-exclamation" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
          </div>
        )}

        {custodia && custodia.length > 0 && (
          <div style={{ marginBottom: 24 }}>
          <ContentCard
            title="Custódia de caixa"
            subtitle="Quanto cada atendente tem sob responsabilidade agora, aberto ou fechado"
            action={
              <button
                onClick={() => router.refresh()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: COM_C.marcaMd, fontWeight: 600, padding: 0,
                }}
              >
                <i className="ti ti-refresh" style={{ fontSize: 13 }} /> Atualizar
              </button>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: COM_C.txtSub, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Atendente</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Comercialização</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Loja</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Total sob custódia</th>
                  </tr>
                </thead>
                <tbody>
                  {custodia.map((c, i) => (
                    <tr key={c.usuario_id} style={{ borderTop: i > 0 ? `1px solid ${COM_C.borda}` : 'none' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: COM_C.txt }}>{c.nome}</td>
                      <td style={{ padding: '10px 8px' }}>
                        {c.comercializacao.status_sessao ? (
                          <>
                            {BRL(c.comercializacao.saldo_atual_especie)}{' '}
                            <span style={{ fontSize: 11, color: c.comercializacao.status_sessao === 'aberta' ? COM_C.verdeTxt : COM_C.txtSub }}>
                              ({c.comercializacao.status_sessao === 'aberta' ? 'caixa aberto' : 'caixa fechado'})
                            </span>
                          </>
                        ) : <span style={{ color: COM_C.txtSub }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {c.loja.status_caixa ? (
                          <>
                            {BRL(c.loja.saldo_atual_especie)}{' '}
                            <span style={{ fontSize: 11, color: c.loja.status_caixa === 'aberto' ? COM_C.verdeTxt : COM_C.txtSub }}>
                              ({c.loja.status_caixa === 'aberto' ? 'caixa aberto' : 'caixa fechado'})
                            </span>
                          </>
                        ) : <span style={{ color: COM_C.txtSub }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: COM_C.txt }}>
                        {BRL(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ContentCard>
          </div>
        )}

        <p className="com-section-label">Módulos</p>
        <div className="com-link-grid" style={{ marginBottom: 28 }}>
          {MODULOS.map((c) => (
            <LinkCard key={c.href} {...c} />
          ))}
        </div>

        <div className="com-chart-row">
          <ContentCard
            title="Últimos lançamentos"
            action={
              <Link href="/financeiro" style={{ fontSize: 12, color: COM_C.marcaMd, textDecoration: 'none', fontWeight: 600 }}>
                Ver todos →
              </Link>
            }
          >
            {ultimosLancamentos.length ? (
              <div>
                {ultimosLancamentos.map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderTop: i > 0 ? `1px solid ${COM_C.borda}` : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COM_C.txt }}>{l.descricao}</div>
                      <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 2 }}>
                        {new Date(l.data_competencia).toLocaleDateString('pt-BR')} ·{' '}
                        <span style={{ color: l.status === 'pago' ? COM_C.verdeTxt : COM_C.laranjaTxt }}>
                          {l.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: l.tipo === 'receita' ? COM_C.verdeTxt : COM_C.vermelho,
                    }}>
                      {l.tipo === 'receita' ? '+' : '-'}{BRL(Number(l.valor))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: COM_C.txtSub, textAlign: 'center', padding: '2rem 0', margin: 0 }}>
                Nenhum lançamento registrado ainda.
              </p>
            )}
          </ContentCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {proximaAssembleia && (
              <div style={{
                background: COM_C.azulLt, border: '1px solid #B5D4F4', borderRadius: 14,
                padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COM_C.azul, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Próxima assembleia
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0C447C' }}>{proximaAssembleia.titulo}</div>
                <div style={{ fontSize: 12, color: COM_C.azul, marginTop: 4 }}>
                  {new Date(proximaAssembleia.data_realizacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <Link href="/assembleias" style={{ fontSize: 12, color: COM_C.azul, textDecoration: 'none', fontWeight: 600, marginTop: 10, display: 'inline-block' }}>
                  Ver assembleias →
                </Link>
              </div>
            )}

            {documentosVencendo.length > 0 && (
              <div style={{
                background: COM_C.laranjaLt, border: '1px solid #FAC775', borderRadius: 14,
                padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COM_C.marrom, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                  Documentos vencendo
                </div>
                {documentosVencendo.map((doc, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 8,
                    padding: '6px 0', borderTop: i > 0 ? '1px solid #EF9F2744' : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: COM_C.marromDk, fontWeight: 500 }}>{doc.nome}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COM_C.vermelho, flexShrink: 0 }}>
                      {new Date(doc.data_validade!).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
                <Link href="/documentos" style={{ fontSize: 12, color: COM_C.marrom, textDecoration: 'none', fontWeight: 600, marginTop: 8, display: 'inline-block' }}>
                  Ver documentos →
                </Link>
              </div>
            )}

            <ContentCard title="Ações rápidas">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ACOES.map((a) => (
                  <Link key={a.href} href={a.href} className="com-link-card" style={{ padding: '12px 14px' }}>
                    <i className={`ti ${a.icon}`} style={{ fontSize: 16, color: COM_C.marcaMd, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: COM_C.txt }}>{a.label}</span>
                  </Link>
                ))}
              </div>
            </ContentCard>
          </div>
        </div>

        {orgTipo === 'cooperativa' && indiceNex && (
          <div style={{ marginTop: 8 }}>{indiceNex}</div>
        )}
      </div>
    </>
  )
}