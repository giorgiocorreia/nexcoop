'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WPP_URL } from './constants'

const DEMO_FILIADOS = [
  { nome: 'Ana Carla Ferreira Mendes', cpf: '•••.456.789-00', status: 'Ativo', cor: '#4ADE80' },
  { nome: 'Carlos Eduardo Lima Santos', cpf: '•••.123.456-00', status: 'Ativo', cor: '#4ADE80' },
  { nome: 'Maria José Rodrigues Silva', cpf: '•••.789.012-00', status: 'Inadimplente', cor: '#F87171' },
  { nome: 'José Antônio Nascimento', cpf: '•••.345.678-00', status: 'Ativo', cor: '#4ADE80' },
]

const DEMO_FINANCEIRO = [
  { desc: 'Taxa de associação — Maio', valor: '+R$ 18.400', status: 'Recebido', positivo: true },
  { desc: 'Aluguel da sede — Junho', valor: '-R$ 2.800', status: 'Pendente', positivo: false },
  { desc: 'Venda coletiva — safra cacau', valor: '+R$ 67.200', status: 'Recebido', positivo: true },
  { desc: 'Material de escritório', valor: '-R$ 380', status: 'Pago', positivo: false },
]

const DEMO_MODULOS = [
  ['👥', 'Cooperados'],
  ['📅', 'Mensalidades'],
  ['💰', 'Financeiro'],
  ['🏛️', 'Assembleias'],
  ['📁', 'Documentos'],
  ['🤝', 'Comercialização'],
]

export default function DemoInterativa() {
  const [aba, setAba] = useState<'dashboard' | 'filiados' | 'financeiro' | 'assembleia'>('dashboard')

  return (
    <section id="demo" style={{ padding: '6rem 1.5rem', background: '#0C447C' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#85B7EB', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.75rem' }}>
          Experimente agora
        </div>
        <h2 style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 'clamp(1.6rem,3vw,2.5rem)', fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: '0.75rem' }}>
          Veja o sistema <em style={{ fontStyle: 'normal', color: '#85B7EB' }}>em ação</em>
        </h2>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1.7, marginBottom: '3rem' }}>
          Explore o painel com dados ilustrativos — sem criar conta, sem compromisso.
        </p>

        <div className="demo-tabs">
          {(['dashboard', 'filiados', 'financeiro', 'assembleia'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)} className={`dtab${aba === a ? ' ativo' : ''}`}>
              {({ dashboard: '📊 Dashboard', filiados: '👥 Filiados', financeiro: '💰 Financeiro', assembleia: '🏛️ Assembleia' } as const)[a]}
            </button>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem' }}>

          {aba === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                {[['284', 'Filiados', '#fff', '272 ativos'], ['R$42k', 'A receber', '#85B7EB', 'Pendentes'], ['R$8k', 'A pagar', '#F87171', 'Pendentes'], ['7', 'Docs vencendo', '#FBBF24', '30 dias']].map(([val, label, cor, sub]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: cor }}>{val}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Módulos</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {DEMO_MODULOS.map(([icon, label]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '1rem' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: '0.6rem' }}>Últimos lançamentos</div>
                  {([['Mensalidades Jun', '+R$18.4k', true], ['Aluguel sede', '-R$2.8k', false]] as const).map(([d, v, pos]) => (
                    <div key={String(d)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: 'rgba(255,255,255,0.7)' }}>
                      <span>{d}</span>
                      <span style={{ fontWeight: 600, color: pos ? '#4ADE80' : '#F87171' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, padding: '1rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#85B7EB', textTransform: 'uppercase', marginBottom: 6 }}>Próxima assembleia</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>AGO 2026</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>28 de julho de 2026</div>
                </div>
              </div>
            </div>
          )}

          {aba === 'filiados' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>284 filiados cadastrados</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Dados ilustrativos</span>
              </div>
              {DEMO_FILIADOS.map(f => (
                <div key={f.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '0.5rem', background: 'rgba(255,255,255,0.04)', fontSize: 13, gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontWeight: 500, flex: 1, minWidth: 120 }}>{f.nome}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{f.cpf}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: `${f.cor}22`, color: f.cor, whiteSpace: 'nowrap' }}>{f.status}</span>
                </div>
              ))}
              <div style={{ textAlign: 'center', padding: '0.75rem', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>+ 280 filiados na lista completa</div>
            </div>
          )}

          {aba === 'financeiro' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '1rem' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>A receber</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#4ADE80' }}>R$ 42.800</div>
                </div>
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '1rem' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>A pagar</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#F87171' }}>R$ 8.300</div>
                </div>
              </div>
              {DEMO_FINANCEIRO.map(f => (
                <div key={f.desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '0.5rem', background: 'rgba(255,255,255,0.04)', fontSize: 13, gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', flex: 1, minWidth: 120 }}>{f.desc}</span>
                  <span style={{ fontWeight: 600, color: f.positivo ? '#4ADE80' : '#F87171', whiteSpace: 'nowrap' }}>{f.valor}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: f.positivo ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)', color: f.positivo ? '#4ADE80' : '#FBBF24', whiteSpace: 'nowrap' }}>{f.status}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.75rem', fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                Lançamentos alimentam a escrituração contábil do módulo Contábil
              </div>
            </div>
          )}

          {aba === 'assembleia' && (
            <div>
              <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Assembleia Geral Ordinária 2026</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>28 de julho de 2026 · 14h · Sede da organização</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: 'rgba(251,191,36,0.15)', color: '#FBBF24', whiteSpace: 'nowrap' }}>Agendada</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Quórum mínimo: 143 filiados (50%) · Convocação enviada: ✓</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Pauta</div>
              {[['1. Aprovação do balanço 2025', 'Deliberação'], ['2. Eleição da nova diretoria', 'Votação'], ['3. Planejamento estratégico 2026', 'Informativo']].map(([item, tipo]) => (
                <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '0.5rem', background: 'rgba(255,255,255,0.04)', fontSize: 13, flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ color: '#fff' }}>{item}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{tipo}</span>
                </div>
              ))}
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Ata gerada automaticamente após o encerramento</div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', textDecoration: 'none' }}>
            Começar grátis — até 10 filiados
          </Link>
          <a href={WPP_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
            💬 Quero conhecer o sistema completo
          </a>
        </div>
      </div>
    </section>
  )
}