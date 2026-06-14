'use client'

import { useState } from 'react'
import { salvarPerfil } from '@/lib/perfil/actions'

type Atividade = {
  id: string
  acao: string
  descricao: string | null
  created_at: string
}

type Dados = {
  usuario: {
    id: string
    nome: string
    cpf: string | null
    email: string | null
    telefone: string | null
    endereco: string | null
    municipio: string | null
    estado: string | null
    funcoes: string[] | null
    vinculo: string | null
    created_at: string
    organizacoes: {
      id: string
      nome: string
      tipo: string
    } | null
  }
  atividades: Atividade[]
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarMembroDesde(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function labelFuncao(funcoes: string[] | null) {
  if (!funcoes || funcoes.length === 0) return 'Membro'
  const mapa: Record<string, string> = {
    admin: 'Administrador',
    financeiro: 'Financeiro',
    tecnico: 'Técnico',
    captador: 'Captador',
    conselho_fiscal: 'Conselho Fiscal',
    caixa_cacau: 'Atendente',
    gerente_loja: 'Gerente de Loja',
    caixa_loja: 'Caixa',
    estoquista_loja: 'Estoquista',
  }
  return mapa[funcoes[0]] ?? funcoes[0]
}

function labelVinculo(vinculo: string | null) {
  const mapa: Record<string, string> = {
    cooperado: 'Cooperado',
    funcionario: 'Funcionário',
    diretoria: 'Diretoria',
    externo: 'Externo',
  }
  return vinculo ? (mapa[vinculo] ?? vinculo) : ''
}

function iconeAtividade(acao: string) {
  if (acao.includes('login'))                              return { icon: 'ti-login',        bg: '#E6F1FB', color: '#185FA5' }
  if (acao.includes('nf') || acao.includes('nota'))       return { icon: 'ti-file-invoice', bg: '#EAF3DE', color: '#3B6D11' }
  if (acao.includes('caixa') || acao.includes('sessao'))  return { icon: 'ti-cash',         bg: '#FAEEDA', color: '#854F0B' }
  if (acao.includes('cooperado') || acao.includes('produtor')) return { icon: 'ti-users',   bg: '#EEEDFE', color: '#3C3489' }
  if (acao.includes('perfil'))                            return { icon: 'ti-user',         bg: '#E6F1FB', color: '#185FA5' }
  return { icon: 'ti-activity', bg: '#F1EFE8', color: '#5F5E5A' }
}

export default function PerfilUsuarioClient({ dados }: { dados: Dados }) {
  const { usuario, atividades } = dados
  const [editando, setEditando]   = useState(false)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState<string | null>(null)
  const [form, setForm] = useState({
    nome:      usuario.nome      ?? '',
    telefone:  usuario.telefone  ?? '',
    endereco:  usuario.endereco  ?? '',
    municipio: usuario.municipio ?? '',
    estado:    usuario.estado    ?? '',
  })

  const org = usuario.organizacoes

  async function handleSalvar() {
    setSalvando(true)
    setErro(null)
    try {
      await salvarPerfil(form)
      setEditando(false)
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  function campo(label: string, valor: string | null, chave?: keyof typeof form) {
    return (
      <div>
        <div style={{ fontSize: 12, color: '#888780', marginBottom: 4 }}>{label}</div>
        {editando && chave ? (
          <input
            value={form[chave]}
            onChange={e => setForm(f => ({ ...f, [chave]: e.target.value }))}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #e5e3dc', borderRadius: 8,
              padding: '6px 10px', fontSize: 14,
              background: 'white', color: '#1a1a1a',
            }}
          />
        ) : (
          <div style={{
            fontSize: 14,
            color: valor ? '#1a1a1a' : '#bbb',
            fontStyle: valor ? 'normal' : 'italic',
          }}>
            {valor || 'Não informado'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 1.5rem', background: '#f8f7f4', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', maxWidth: 960, margin: '0 auto' }}>

        {/* COLUNA ESQUERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Card principal */}
          <div style={{ background: 'white', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.5rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#E6F1FB', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, fontWeight: 500,
                color: '#185FA5', flexShrink: 0,
              }}>
                {iniciais(usuario.nome)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 17, fontWeight: 500, color: '#1a1a1a' }}>
                    {usuario.nome}
                  </span>
                  <span style={{
                    background: '#EAF3DE', color: '#3B6D11',
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                  }}>
                    {labelFuncao(usuario.funcoes)}
                  </span>
                  <span style={{
                    background: '#E6F1FB', color: '#185FA5',
                    fontSize: 11, padding: '2px 8px', borderRadius: 6,
                  }}>
                    ● Conta ativa
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 3 }}>
                  {[
                    labelVinculo(usuario.vinculo),
                    org?.nome,
                    `Membro desde ${formatarMembroDesde(usuario.created_at)}`,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              {!editando ? (
                <button
                  onClick={() => setEditando(true)}
                  style={{
                    background: 'none', border: '1px solid #e5e3dc', borderRadius: 8,
                    padding: '6px 12px', fontSize: 13, color: '#555',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  }}
                >
                  <i className="ti ti-edit" style={{ fontSize: 15 }} aria-hidden="true" /> Editar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setEditando(false); setErro(null) }}
                    style={{
                      background: 'none', border: '1px solid #e5e3dc', borderRadius: 8,
                      padding: '6px 12px', fontSize: 13, color: '#555', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvar}
                    disabled={salvando}
                    style={{
                      background: '#378ADD', border: '1px solid #378ADD', borderRadius: 8,
                      padding: '6px 14px', fontSize: 13, color: 'white',
                      cursor: salvando ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                      opacity: salvando ? 0.7 : 1,
                    }}
                  >
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>

            {erro && (
              <div style={{
                background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, color: '#A32D2D', marginBottom: '1rem',
              }}>
                {erro}
              </div>
            )}

            {/* Dados pessoais */}
            <div style={{ borderTop: '1px solid #e5e3dc', paddingTop: '1.25rem' }}>
              <div style={{
                fontSize: 11, fontWeight: 500, color: '#888780',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem',
              }}>
                Dados pessoais
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {campo('Nome completo', usuario.nome, 'nome')}
                <div>
                  <div style={{ fontSize: 12, color: '#888780', marginBottom: 4 }}>CPF</div>
                  <div style={{ fontSize: 14, color: usuario.cpf ? '#1a1a1a' : '#bbb', fontStyle: usuario.cpf ? 'normal' : 'italic' }}>
                    {usuario.cpf ?? 'Não informado'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888780', marginBottom: 4 }}>E-mail</div>
                  <div style={{ fontSize: 14, color: usuario.email ? '#1a1a1a' : '#bbb', fontStyle: usuario.email ? 'normal' : 'italic' }}>
                    {usuario.email ?? 'Não informado'}
                  </div>
                </div>
                {campo('Telefone', usuario.telefone, 'telefone')}
                <div style={{ gridColumn: '1 / -1' }}>
                  {campo('Endereço', usuario.endereco, 'endereco')}
                </div>
                {campo('Município', usuario.municipio, 'municipio')}
                {campo('Estado', usuario.estado, 'estado')}
              </div>
            </div>
          </div>

          {/* Atividades recentes */}
          <div style={{ background: 'white', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: '#888780',
              letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              Atividades recentes
            </div>
            {atividades.length === 0 ? (
              <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>
                Nenhuma atividade registrada ainda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {atividades.map((a, i) => {
                  const { icon, bg, color } = iconeAtividade(a.acao)
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex', gap: 12, padding: '10px 0',
                        borderBottom: i < atividades.length - 1 ? '1px solid #f0ede8' : 'none',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                      }}>
                        <i className={`ti ${icon}`} style={{ fontSize: 15, color }} aria-hidden="true" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#1a1a1a' }}>
                          {a.descricao ?? a.acao}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b6b6b' }}>
                          {formatarData(a.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Módulos com acesso */}
          <div style={{ background: 'white', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: '#888780',
              letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              Módulos com acesso
            </div>
            {[
              { nome: 'Comercialização', cor: '#92400e' },
              { nome: 'Captação',        cor: '#1D9E75' },
              { nome: 'Financeiro',      cor: '#0F766E' },
              { nome: 'Loja',            cor: '#E07B30' },
            ].map(m => (
              <div
                key={m.nome}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', fontSize: 13, padding: '5px 0',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: m.cor, display: 'inline-block', flexShrink: 0,
                  }} />
                  {m.nome}
                </span>
                <span style={{
                  background: '#EAF3DE', color: '#3B6D11',
                  fontSize: 11, padding: '2px 8px', borderRadius: 6,
                }}>
                  Ativo
                </span>
              </div>
            ))}
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: '1px solid #f0ede8',
              fontSize: 12, color: '#bbb',
            }}>
              Acesso gerenciado pelo administrador.
            </div>
          </div>

          {/* Notificações */}
          <div style={{ background: 'white', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: '#888780',
              letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              Notificações
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'E-mail de assembleias', ativo: true },
                { label: 'Alertas de captação',   ativo: true },
                { label: 'Novidades do sistema',  ativo: false },
              ].map(n => (
                <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#1a1a1a' }}>{n.label}</span>
                  <div style={{
                    width: 36, height: 20,
                    background: n.ativo ? '#635BFF' : '#e5e3dc',
                    borderRadius: 10, position: 'relative', flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: 3,
                      ...(n.ativo ? { right: 3 } : { left: 3 }),
                      width: 14, height: 14, borderRadius: '50%', background: 'white',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Segurança */}
          <div style={{ background: 'white', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: '#888780',
              letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              Segurança
            </div>
            <button
              style={{
                width: '100%', background: 'none', border: '1px solid #e5e3dc',
                borderRadius: 8, padding: '8px 12px', fontSize: 13,
                color: '#555', cursor: 'pointer',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <i className="ti ti-lock" style={{ fontSize: 15 }} aria-hidden="true" /> Alterar senha
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
