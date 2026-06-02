'use client'

import { useState, useEffect } from 'react'
import { gerarManualContabil, gerarManualFinanceiro, gerarTodosManuais, getUrlManual } from '@/lib/manuais/generator'

const COR = '#635BFF'

const MANUAIS = [
  {
    id: 'contabil',
    titulo: 'Módulo Contábil',
    desc: 'Manual completo para administradores e contadores',
    chave: 'manual_contabil_url',
    icon: '📊',
    cor: '#0F766E',
    fn: gerarManualContabil,
  },
  {
    id: 'financeiro',
    titulo: 'Módulo Financeiro',
    desc: 'Registro e controle de lançamentos financeiros',
    chave: 'manual_financeiro_url',
    icon: '💰',
    cor: '#635BFF',
    fn: gerarManualFinanceiro,
  },
] as const

export default function ManuaisClient() {
  const [urls, setUrls]       = useState<Record<string, string | null>>({})
  const [gerando, setGerando] = useState<string>('')
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    Promise.all(
      MANUAIS.map(m => getUrlManual(m.chave).then(url => ({ [m.id]: url })))
    ).then(results => setUrls(Object.assign({}, ...results)))
  }, [])

  async function handleGerar(manual: typeof MANUAIS[number]) {
    setGerando(manual.id); setErro('')
    try {
      const url = await manual.fn()
      setUrls(u => ({ ...u, [manual.id]: url }))
      setSucesso(`Manual "${manual.titulo}" gerado e publicado!`)
      setTimeout(() => setSucesso(''), 4000)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setGerando('')
    }
  }

  async function handleGerarTodos() {
    setGerando('todos'); setErro('')
    try {
      const result = await gerarTodosManuais()
      setUrls(u => ({ ...u, contabil: result.contabil, financeiro: result.financeiro }))
      setSucesso('Todos os manuais gerados e publicados!')
      setTimeout(() => setSucesso(''), 4000)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setGerando('')
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Manuais do Sistema</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Gere e publique os manuais de cada módulo. Os usuários têm acesso via botão de ajuda em cada tela.
          </p>
        </div>
        <button
          onClick={handleGerarTodos}
          disabled={gerando !== ''}
          style={{ padding: '10px 20px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {gerando === 'todos' ? 'Gerando todos...' : '🔄 Atualizar Todos'}
        </button>
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
        {MANUAIS.map(manual => (
          <div
            key={manual.id}
            style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
              <span style={{ fontSize: 28 }}>{manual.icon}</span>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{manual.titulo}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{manual.desc}</p>
                {urls[manual.id] ? (
                  <a
                    href={urls[manual.id]!}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11, color: manual.cor, marginTop: 4, display: 'inline-block' }}
                  >
                    ✓ Publicado — ver PDF
                  </a>
                ) : (
                  <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'inline-block' }}>
                    Não gerado ainda
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleGerar(manual)}
              disabled={gerando !== ''}
              style={{ padding: '9px 18px', background: manual.cor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 160 }}
            >
              {gerando === manual.id ? 'Gerando...' : '🔄 Gerar Manual'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '14px 16px', marginTop: 24, fontSize: 12, color: '#6b7280' }}>
        Os manuais são armazenados no Supabase Storage e disponibilizados via botão de ajuda (?) em cada módulo.
        Ao clicar em "Gerar Manual", o PDF anterior é substituído automaticamente.
      </div>
    </div>
  )
}
