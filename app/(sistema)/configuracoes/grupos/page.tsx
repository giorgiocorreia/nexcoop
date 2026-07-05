'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { listarGruposOrg, criarGrupoOrg, alterarStatusGrupo } from './actions'
import { PageLayout, MODULO_CONFIG, COM_C } from '@/components/nexcoop/ui'

type GrupoEnriquecido = {
  id: string
  nome: string
  cnpj: string | null
  descricao: string | null
  ativo: boolean
  criado_em: string
  total_membros: number
  votos_disponiveis: number
  reps_necessarios: number
  reps_ativos: number
  status_ok: boolean
}

export default function GruposPage() {
  const [grupos, setGrupos]         = useState<GrupoEnriquecido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalNovo, setModalNovo]   = useState(false)
  const [formNome, setFormNome]     = useState('')
  const [formCnpj, setFormCnpj]     = useState('')
  const [formDesc, setFormDesc]     = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState<string | null>(null)
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const data = await listarGruposOrg()
      setGrupos(data as GrupoEnriquecido[])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    }
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function handleCriar() {
    if (!formNome.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      await criarGrupoOrg({
        nome:      formNome.trim(),
        cnpj:      formCnpj.trim() || undefined,
        descricao: formDesc.trim() || undefined,
      })
      setModalNovo(false)
      setFormNome('')
      setFormCnpj('')
      setFormDesc('')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar grupo')
    }
    setSalvando(false)
  }

  async function handleToggleAtivo(grupoId: string, ativo: boolean) {
    try {
      await alterarStatusGrupo(grupoId, !ativo)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar')
    }
  }

  const gruposFiltrados = grupos.filter(g => {
    if (filtroAtivo === 'ativos') return g.ativo
    if (filtroAtivo === 'inativos') return !g.ativo
    return true
  })

  return (
    <PageLayout
      titulo="Grupos de Colaboradores"
      subtitulo="Grupos de cooperados com cota colaboradora — voto via representante, 10% nas sobras"
      icone="ti-users-group"
      modulo={MODULO_CONFIG}
      breadcrumb={[{ label: 'Grupos de Colaboradores' }]}
      acoes={
        <button onClick={() => { setModalNovo(true); setErro(null) }} style={btnPrimary}>
          + Novo grupo
        </button>
      }
    >
      {/* Modal novo grupo */}
      {modalNovo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Novo grupo de colaboradores</div>
              <button onClick={() => { setModalNovo(false); setErro(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b6b6b' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nome do grupo *</label>
                <input
                  type="text" placeholder="Ex: Meeiros da Fazenda Santa Maria"
                  value={formNome} onChange={e => setFormNome(e.target.value)}
                  style={inputStyle} autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>CNPJ (opcional)</label>
                <input
                  type="text" placeholder="00.000.000/0000-00"
                  value={formCnpj} onChange={e => setFormCnpj(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Descrição (opcional)</label>
                <input
                  type="text" placeholder="Breve descrição do grupo"
                  value={formDesc} onChange={e => setFormDesc(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            {erro && (
              <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626' }}>
                {erro}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setModalNovo(false); setErro(null) }} style={btnSecondary}>Cancelar</button>
              <button onClick={handleCriar} disabled={salvando || !formNome.trim()} style={btnPrimary}>
                {salvando ? 'Criando…' : 'Criar grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtro */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['ativos', 'inativos', 'todos'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltroAtivo(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: 'none',
              background: filtroAtivo === f ? COM_C.verde : '#fff',
              color: filtroAtivo === f ? '#fff' : '#555',
              fontWeight: filtroAtivo === f ? 600 : 400,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            {f === 'ativos' ? 'Ativos' : f === 'inativos' ? 'Inativos' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Estado de erro */}
      {erro && !modalNovo && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {/* Carregando */}
      {carregando && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: 32, textAlign: 'center', color: '#6b6b6b' }}>
          Carregando grupos…
        </div>
      )}

      {/* Lista vazia */}
      {!carregando && gruposFiltrados.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b6b6b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Nenhum grupo encontrado</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Crie o primeiro grupo de colaboradores para a sua cooperativa.</div>
          <button onClick={() => setModalNovo(true)} style={btnPrimary}>+ Criar grupo</button>
        </div>
      )}

      {/* Cards de grupos */}
      {!carregando && gruposFiltrados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {gruposFiltrados.map(g => {
            const statusColor = g.status_ok ? '#166534' : '#92400e'
            const statusBg    = g.status_ok ? '#dcfce7' : '#fef3c7'
            const statusLabel = g.reps_necessarios === 0
              ? 'Sem representantes necessários'
              : g.status_ok
                ? `${g.reps_ativos}/${g.reps_necessarios} representantes`
                : `Faltam representantes (${g.reps_ativos}/${g.reps_necessarios})`

            return (
              <div key={g.id} style={{
                background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: 20,
                opacity: g.ativo ? 1 : 0.6,
              }}>
                {/* Nome + status ativo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>{g.nome}</div>
                    {g.cnpj && <div style={{ fontSize: 12, color: '#888' }}>{g.cnpj}</div>}
                    {g.descricao && <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>{g.descricao}</div>}
                  </div>
                  <button
                    onClick={() => handleToggleAtivo(g.id, g.ativo)}
                    title={g.ativo ? 'Desativar grupo' : 'Ativar grupo'}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: g.ativo ? '#dcfce7' : '#f3f4f6',
                      color: g.ativo ? '#166534' : '#6b7280',
                      fontWeight: 600, flexShrink: 0, marginLeft: 8,
                    }}
                  >
                    {g.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={metricCard}>
                    <div style={metricLabel}>Membros</div>
                    <div style={metricValue}>{g.total_membros}</div>
                  </div>
                  <div style={metricCard}>
                    <div style={metricLabel}>Votos disponíveis</div>
                    <div style={metricValue}>{g.votos_disponiveis}</div>
                  </div>
                </div>

                {/* Status representantes */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: statusBg, borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 500, color: statusColor,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                  {statusLabel}
                </div>

                {/* Rodapé — data criação */}
                <div style={{ marginTop: 12, fontSize: 11, color: '#bbb' }}>
                  Criado em {new Date(g.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 14,
  border: '1px solid #e5e3dc', borderRadius: 8,
  background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6b6b', marginBottom: 5,
}
const metricCard: React.CSSProperties = {
  background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: 8, padding: '8px 12px',
}
const metricLabel: React.CSSProperties = {
  fontSize: 11, color: '#888', fontWeight: 500, marginBottom: 3,
}
const metricValue: React.CSSProperties = {
  fontSize: 20, fontWeight: 700, color: '#1a1a1a',
}
const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 600,
  background: COM_C.verde, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 400,
  background: 'transparent', color: '#555', border: '1px solid #d5d3cc', borderRadius: 8, cursor: 'pointer',
}
