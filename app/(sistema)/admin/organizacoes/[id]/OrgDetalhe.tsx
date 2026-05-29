'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Organizacao, Usuario, RoleUsuario } from '@/types/database'

const PLANO_CONFIG: Record<string, { label: string; cor: string; bg: string }> = {
  gratuito:    { label: 'Gratuito',    cor: '#555',    bg: '#f0eeea' },
  essencial:   { label: 'Essencial',   cor: '#444',    bg: '#f5f5f2' },
  cooperativa: { label: 'Cooperativa', cor: '#185FA5', bg: '#E6F1FB' },
  profissional:{ label: 'Profissional',cor: '#0F6E56', bg: '#E1F5EE' },
  agro:        { label: 'Agro',        cor: '#0F6E56', bg: '#E1F5EE' },
  impacto:     { label: 'Impacto',     cor: '#6366f1', bg: '#ede9fe' },
  enterprise:  { label: 'Enterprise',  cor: '#854F0B', bg: '#FAEEDA' },
}

const ROLE_LABEL: Record<RoleUsuario, string> = {
  super_admin:     'Super Admin',
  org_admin:       'Administrador',
  financeiro:      'Financeiro',
  tecnico:         'Técnico',
  comercial:       'Comercial',
  conselho_fiscal: 'Conselho Fiscal',
  cooperado:       'Cooperado',
  parceiro:        'Parceiro',
}

const PLANOS = ['gratuito', 'essencial', 'profissional', 'agro', 'enterprise']

interface Props {
  org: Organizacao
  usuarios: Usuario[]
  totalCooperados: number
  totalMensalidades: number
  totalDocumentos: number
}

function IsentarForm({ org, onUpdate }: { org: Organizacao; onUpdate: (org: Organizacao) => void }) {
  const supabase = createClient()
  const [salvando, setSalvando] = useState(false)
  const [isento, setIsento] = useState((org as any).isento ?? false)
  const [modo, setModo] = useState<'data' | 'indefinido'>(
    (org as any).isento_ate === '9999-12-31' ? 'indefinido' : 'data'
  )
  const [isentoAte, setIsentoAte] = useState(
    (org as any).isento_ate === '9999-12-31' ? '' : (org as any).isento_ate || ''
  )
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  async function salvar() {
    setSalvando(true)
    setErro('')
    setSucesso('')

    const payload = {
      isento,
      isento_ate: !isento ? null : modo === 'indefinido' ? '9999-12-31' : isentoAte || null,
    }

    const { error } = await supabase
      .from('organizacoes')
      .update(payload)
      .eq('id', org.id)

    if (error) {
      setErro(error.message)
    } else {
      setSucesso('Isenção atualizada.')
      onUpdate({ ...org, ...payload } as Organizacao)
    }
    setSalvando(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input type="checkbox" checked={isento} onChange={e => setIsento(e.target.checked)}
          style={{ accentColor: '#1D9E75', width: '16px', height: '16px' }} />
        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
          Organização isenta de pagamento
        </span>
      </label>

      {isento && (
        <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {[
              { val: 'data', label: 'Até uma data' },
              { val: 'indefinido', label: 'Indefinidamente' },
            ].map(op => (
              <label key={op.val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#555' }}>
                <input type="radio" name="modo_isencao" value={op.val}
                  checked={modo === op.val}
                  onChange={() => setModo(op.val as 'data' | 'indefinido')}
                  style={{ accentColor: '#1D9E75' }} />
                {op.label}
              </label>
            ))}
          </div>

          {modo === 'data' && (
            <input type="date" value={isentoAte}
              onChange={e => setIsentoAte(e.target.value)}
              style={{
                padding: '8px 12px', border: '1px solid #d5d3cc',
                borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
                maxWidth: '200px', outline: 'none',
              }}
            />
          )}

          {modo === 'indefinido' && (
            <div style={{
              fontSize: '12px', color: '#92400e',
              background: '#fef3c7', border: '1px solid #f5c842',
              borderRadius: '6px', padding: '6px 10px',
            }}>
              ⚠️ Isenção sem prazo — válida até você alterar manualmente.
            </div>
          )}
        </div>
      )}

      {erro && <div style={{ fontSize: '12px', color: '#dc2626' }}>{erro}</div>}
      {sucesso && <div style={{ fontSize: '12px', color: '#0F6E56' }}>✓ {sucesso}</div>}

      <button onClick={salvar} disabled={salvando} style={{
        padding: '8px 16px', background: salvando ? '#7fceb1' : '#1D9E75',
        color: '#fff', border: 'none', borderRadius: '8px',
        fontSize: '13px', fontWeight: '600',
        cursor: salvando ? 'not-allowed' : 'pointer',
        alignSelf: 'flex-start',
      }}>
        {salvando ? 'Salvando...' : 'Salvar isenção'}
      </button>
    </div>
  )
}

export default function OrgDetalhe({ org: orgInicial, usuarios, totalCooperados, totalMensalidades, totalDocumentos }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [org, setOrg] = useState(orgInicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function alterarPlano(novoPlano: string) {
    setSalvando(true)
    setErro('')
    setSucesso('')
    const { error } = await supabase
      .from('organizacoes')
      .update({ plano: novoPlano as any })
      .eq('id', org.id)
    if (error) {
      setErro(error.message)
    } else {
      setOrg(prev => ({ ...prev, plano: novoPlano as any }))
      setSucesso(`Plano alterado para ${PLANO_CONFIG[novoPlano]?.label ?? novoPlano}.`)
    }
    setSalvando(false)
  }

  async function toggleAtivo() {
    setSalvando(true)
    setErro('')
    setSucesso('')
    const novoAtivo = !org.ativo
    const { error } = await supabase
      .from('organizacoes')
      .update({ ativo: novoAtivo })
      .eq('id', org.id)
    if (error) {
      setErro(error.message)
    } else {
      setOrg(prev => ({ ...prev, ativo: novoAtivo }))
      setSucesso(novoAtivo ? 'Organização ativada.' : 'Organização desativada.')
    }
    setSalvando(false)
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
        <button onClick={() => router.push('/admin')}
          style={{ fontSize: '13px', color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Admin
        </button>
        <span style={{ color: '#aaa', fontSize: '13px' }}>›</span>
        <span style={{ fontSize: '13px', color: '#555' }}>Organizações</span>
        <span style={{ color: '#aaa', fontSize: '13px' }}>›</span>
        <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>{org.nome}</span>
      </div>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: '#E1F5EE', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '22px', flexShrink: 0,
          }}>🌱</div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>{org.nome}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              {org.nome_curto && <span style={{ fontSize: '12px', color: '#888' }}>{org.nome_curto}</span>}
              <span style={{
                display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
                fontSize: '11px', fontWeight: '600',
                color: org.ativo ? '#0F6E56' : '#7f1d1d',
                background: org.ativo ? '#E1F5EE' : '#fee2e2',
              }}>
                {org.ativo ? 'Ativa' : 'Inativa'}
              </span>
              {(org as any).isento && (
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: '600', color: '#854F0B', background: '#fef3c7',
                }}>
                  Isenta
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={toggleAtivo} disabled={salvando} style={{
          padding: '9px 18px',
          background: org.ativo ? '#fef2f2' : '#E1F5EE',
          color: org.ativo ? '#dc2626' : '#0F6E56',
          border: `1px solid ${org.ativo ? '#fca5a5' : '#1D9E7533'}`,
          borderRadius: '8px', fontSize: '13px', fontWeight: '600',
          cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.6 : 1,
        }}>
          {org.ativo ? 'Desativar organização' : 'Ativar organização'}
        </button>
      </div>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '13px', color: '#dc2626' }}>
          {erro}
        </div>
      )}
      {sucesso && (
        <div style={{ background: '#E1F5EE', border: '1px solid #1D9E7533', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '13px', color: '#0F6E56' }}>
          {sucesso}
        </div>
      )}

      {/* Cards de estatísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Filiados', valor: totalCooperados, cor: '#0F6E56', bg: '#E1F5EE' },
          { label: 'Mensalidades', valor: totalMensalidades, cor: '#185FA5', bg: '#E6F1FB' },
          { label: 'Documentos', valor: totalDocumentos, cor: '#6366f1', bg: '#ede9fe' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: '12px', padding: '1rem 1.25rem',
            border: `1px solid ${s.cor}22`,
          }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: s.cor, marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: s.cor }}>{s.valor}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Dados da organização */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>Dados da organização</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { label: 'CNPJ', valor: org.cnpj || '—' },
              { label: 'Tipo', valor: org.tipo === 'cooperativa' ? 'Cooperativa' : org.tipo === 'associacao' ? 'Associação' : 'Central' },
              { label: 'E-mail', valor: org.email || '—' },
              { label: 'Telefone', valor: org.telefone || '—' },
              { label: 'Cidade / UF', valor: org.cidade && org.estado ? `${org.cidade} / ${org.estado}` : org.cidade || org.estado || '—' },
              { label: 'Fundação', valor: org.data_fundacao ? new Date(org.data_fundacao + 'T00:00:00').toLocaleDateString('pt-BR') : '—' },
              { label: 'Criado em', valor: new Date(org.criado_em).toLocaleDateString('pt-BR') },
            ].map((item, i, arr) => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0',
                borderBottom: i < arr.length - 1 ? '1px solid #f0eeea' : 'none',
              }}>
                <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{item.label}</span>
                <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{item.valor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alterar plano */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.75rem' }}>Plano atual</div>
          <div style={{ marginBottom: '1rem' }}>
            {(() => {
              const cfg = PLANO_CONFIG[org.plano] ?? { label: org.plano, cor: '#444', bg: '#f5f5f2' }
              return (
                <span style={{
                  display: 'inline-block', padding: '5px 14px',
                  borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                  color: cfg.cor, background: cfg.bg,
                }}>
                  {cfg.label}
                </span>
              )
            })()}
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Alterar para
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {PLANOS.filter(p => p !== org.plano).map(plano => {
              const cfg = PLANO_CONFIG[plano]
              return (
                <button key={plano} onClick={() => alterarPlano(plano)} disabled={salvando}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: '#fafaf8', border: '1px solid #e5e3dc',
                    borderRadius: '8px', cursor: salvando ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    textAlign: 'left', opacity: salvando ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { if (!salvando) (e.currentTarget as HTMLButtonElement).style.background = cfg.bg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fafaf8' }}
                >
                  <span style={{
                    display: 'inline-block', padding: '2px 8px',
                    borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                    color: cfg.cor, background: cfg.bg,
                  }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#888' }}>Migrar para este plano</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Isenção */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>
          Isenção de pagamento
        </div>
        <IsentarForm org={org} onUpdate={setOrg} />
      </div>

      {/* Usuários vinculados */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e3dc' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>
            Usuários ({usuarios.length})
          </span>
        </div>
        {usuarios.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
            Nenhum usuário vinculado a esta organização.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafaf8', borderBottom: '1px solid #e5e3dc' }}>
                {['Nome', 'E-mail', 'Role', 'Status'].map(col => (
                  <th key={col} style={{
                    padding: '8px 16px', textAlign: 'left',
                    fontSize: '11px', fontWeight: '600', color: '#888',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr key={u.id} style={{ borderTop: i > 0 ? '1px solid #f0eeea' : 'none' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: '#e8f7f2', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '12px', fontWeight: '600',
                        color: '#0F6E56', flexShrink: 0,
                      }}>
                        {u.nome_completo.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>
                        {u.nome_completo}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#555' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px',
                      borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                      color: u.role === 'org_admin' ? '#0F6E56' : u.role === 'super_admin' ? '#6366f1' : '#555',
                      background: u.role === 'org_admin' ? '#E1F5EE' : u.role === 'super_admin' ? '#ede9fe' : '#f5f5f2',
                    }}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px',
                      borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                      color: u.ativo ? '#0F6E56' : '#7f1d1d',
                      background: u.ativo ? '#E1F5EE' : '#fee2e2',
                    }}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}