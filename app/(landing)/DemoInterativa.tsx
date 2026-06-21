'use client'

import { useState } from 'react'

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

const WPP_URL = 'https://wa.me/55SEUNUMERO'

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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[['284', 'Filiados ativos', '#fff'], ['R$42k', 'Receitas do mês', '#4ADE80'], ['7', 'Docs vencendo', '#FBBF24'], ['28 Jul', 'Próx. assembleia', '#85B7EB']].map(([val, label, cor]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: cor }}>{val}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>Evolução de filiados — 2025</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
                  {[32, 48, 40, 60, 52, 78, 100].map((h, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', height: `${h}%`, background: i >= 5 ? 'linear-gradient(180deg,#85B7EB,#185FA5)' : `rgba(55,138,221,${0.25 + i * 0.06})` }} />
                  ))}
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

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a href={WPP_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#fff', background: '#1D9E75', textDecoration: 'none' }}>
            💬 Quero conhecer o sistema completo
          </a>
        </div>
      </div>
    </section>
  )
}
