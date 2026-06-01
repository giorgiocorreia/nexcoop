'use client'

import { useState } from 'react'
import { gerarSpedECD } from '@/lib/contabil/actions'

const COR = '#0F766E'

export default function ExportacoesClient({ orgId, userId }: { orgId: string; userId: string }) {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [gerando, setGerando] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleSpedECD() {
    setGerando('sped'); setErro('')
    try {
      const conteudo = await gerarSpedECD(orgId, ano)
      const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SPED_ECD_${ano}.txt`
      a.click()
      URL.revokeObjectURL(url)
      setSucesso('SPED ECD gerado e baixado com sucesso!')
      setTimeout(() => setSucesso(''), 4000)
    } catch (e: any) { setErro(e.message) }
    finally { setGerando('') }
  }

  function handlePrintRelatorio(rota: string) {
    window.open(`/contabil/${rota}?print=1&ano=${ano}`, '_blank')
  }

  const exportacoes = [
    {
      id: 'sped',
      titulo: 'SPED ECD — Escrituração Contábil Digital',
      desc: 'Arquivo TXT auxiliar no formato SPED para entrega à Receita Federal. Use como base no seu sistema contábil principal.',
      icon: '📊',
      badge: 'Receita Federal',
      badgeCor: '#1d4ed8',
      badgeBg: '#dbeafe',
      acao: handleSpedECD,
      btnLabel: 'Gerar SPED ECD (.txt)',
    },
    {
      id: 'balancete',
      titulo: 'Balancete Mensal',
      desc: 'Exporta o balancete do período selecionado em formato para impressão.',
      icon: '📋',
      badge: 'PDF / Impressão',
      badgeCor: COR,
      badgeBg: '#dcfce7',
      acao: () => handlePrintRelatorio('balancete'),
      btnLabel: 'Exportar Balancete',
    },
    {
      id: 'dre',
      titulo: 'DRE — Demonstrativo de Resultado',
      desc: 'Demonstrativo de Resultado do Exercício com Sobras ou Perdas.',
      icon: '📈',
      badge: 'PDF / Impressão',
      badgeCor: COR,
      badgeBg: '#dcfce7',
      acao: () => handlePrintRelatorio('dre'),
      btnLabel: 'Exportar DRE',
    },
    {
      id: 'balanco',
      titulo: 'Balanço Patrimonial',
      desc: 'Posição patrimonial completa — Ativo, Passivo e Patrimônio Líquido.',
      icon: '⚖️',
      badge: 'PDF / Impressão',
      badgeCor: COR,
      badgeBg: '#dcfce7',
      acao: () => handlePrintRelatorio('balanco'),
      btnLabel: 'Exportar Balanço',
    },
    {
      id: 'diario',
      titulo: 'Livro Diário',
      desc: 'Registro cronológico completo de todos os lançamentos do exercício.',
      icon: '📒',
      badge: 'PDF / Impressão',
      badgeCor: COR,
      badgeBg: '#dcfce7',
      acao: () => handlePrintRelatorio('diario'),
      btnLabel: 'Exportar Livro Diário',
    },
    {
      id: 'razao',
      titulo: 'Livro Razão',
      desc: 'Movimentações detalhadas por conta contábil no período.',
      icon: '📗',
      badge: 'PDF / Impressão',
      badgeCor: COR,
      badgeBg: '#dcfce7',
      acao: () => handlePrintRelatorio('razao'),
      btnLabel: 'Exportar Livro Razão',
    },
  ]

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Exportações Contábeis</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Gere arquivos e relatórios para entrega ao escritório de contabilidade ou à Receita Federal
          </p>
        </div>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
          {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {sucesso && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>
          {sucesso}
        </div>
      )}
      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          {erro}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {exportacoes.map(exp => (
          <div key={exp.id} style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc',
            padding: '20px 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
              <span style={{ fontSize: 28 }}>{exp.icon}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{exp.titulo}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: exp.badgeBg, color: exp.badgeCor,
                  }}>
                    {exp.badge}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{exp.desc}</p>
              </div>
            </div>
            <button
              onClick={exp.acao}
              disabled={gerando === exp.id}
              style={{
                padding: '9px 18px', background: COR, color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: gerando === exp.id ? 'default' : 'pointer',
                whiteSpace: 'nowrap', minWidth: 180,
                opacity: gerando === exp.id ? 0.7 : 1,
              }}
            >
              {gerando === exp.id ? 'Gerando...' : exp.btnLabel}
            </button>
          </div>
        ))}
      </div>

      <div style={{
        background: '#fffbeb', border: '1px solid #f59e0b',
        borderRadius: 8, padding: '12px 16px', marginTop: 24,
        fontSize: 12, color: '#92400e',
      }}>
        ⚠️ O arquivo SPED ECD gerado pelo NexCoop é um arquivo <strong>auxiliar</strong>. Deve ser revisado e validado pelo contador responsável antes da entrega oficial à Receita Federal através do programa SPED do governo.
      </div>
    </div>
  )
}
