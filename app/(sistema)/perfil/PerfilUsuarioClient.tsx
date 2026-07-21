'use client'

import { useState } from 'react'
import { salvarPerfil } from '@/lib/perfil/actions'
import { cpfInvalidoMsg } from '@/lib/utils/cpf'
import { PageLayout, MODULO_NEXCOOP } from '@/components/nexcoop/ui'
import { CampoSenha } from '@/components/CampoSenha'
import { createClient } from '@/lib/supabase/client'

type Atividade = {
  id: string
  acao: string
  descricao: string | null
  created_at: string
}

type Usuario = {
  id: string
  nome_completo: string
  cpf: string | null
  email: string | null
  telefone: string | null
  avatar_url: string | null
  endereco: string | null
  municipio: string | null
  estado: string | null
  funcoes: string[] | null
  vinculo: string | null
  ativo: boolean
  criado_em: string
  organizacoes: {
    id: string
    nome: string
    tipo: string
  } | null
}

type Dados = {
  usuario: Usuario
  atividades: Atividade[]
}

type FormFields = {
  nome_completo: string
  cpf:           string
  telefone:      string
  endereco:      string
  municipio:     string
  estado:        string
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarMembroDesde(iso: string) {
  const d = new Date(iso)
  const mes = d.toLocaleDateString('pt-BR', { month: 'long' })
  const ano = d.getFullYear()
  return `${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${ano}`
}

function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function labelFuncao(funcoes: string[] | null) {
  if (!funcoes || funcoes.length === 0) return 'Membro'
  const mapa: Record<string, string> = {
    admin:           'Administrador',
    financeiro:      'Financeiro',
    tecnico:         'Técnico',
    captador:        'Captador',
    conselho_fiscal: 'Conselho Fiscal',
    caixa_cacau:     'Atendente',
    gerente_loja:    'Gerente de Loja',
    caixa_loja:      'Caixa',
    estoquista_loja: 'Estoquista',
  }
  return mapa[funcoes[0]] ?? funcoes[0]
}

function labelVinculo(vinculo: string | null) {
  const mapa: Record<string, string> = {
    cooperado:   'Cooperado',
    funcionario: 'Funcionário',
    diretoria:   'Diretoria',
    externo:     'Externo',
  }
  return vinculo ? (mapa[vinculo] ?? vinculo) : ''
}

function iconeAtividade(acao: string) {
  if (acao.includes('login'))                               return { icon: 'ti-login',        bg: '#E6F1FB', color: '#185FA5' }
  if (acao.includes('nf') || acao.includes('nota'))        return { icon: 'ti-file-invoice', bg: '#EAF3DE', color: '#3B6D11' }
  if (acao.includes('caixa') || acao.includes('sessao'))   return { icon: 'ti-cash',         bg: '#FAEEDA', color: '#854F0B' }
  if (acao.includes('cooperado') || acao.includes('produtor')) return { icon: 'ti-users',    bg: '#EEEDFE', color: '#3C3489' }
  if (acao.includes('perfil'))                             return { icon: 'ti-user',          bg: '#E6F1FB', color: '#185FA5' }
  return { icon: 'ti-activity', bg: '#F1EFE8', color: '#5F5E5A' }
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e5e3dc', borderRadius: 8,
  padding: '6px 10px', fontSize: 14,
  background: 'white', color: 'var(--color-text-primary)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: '#888780', marginBottom: 4,
}

const campos: { label: string; campo: keyof FormFields; colSpan?: boolean }[] = [
  { label: 'Nome completo', campo: 'nome_completo' },
  { label: 'CPF',           campo: 'cpf' },
  { label: 'Telefone',      campo: 'telefone' },
  { label: 'Endereço',      campo: 'endereco', colSpan: true },
  { label: 'Município',     campo: 'municipio' },
  { label: 'Estado',        campo: 'estado' },
]

export default function PerfilUsuarioClient({ dados }: { dados: Dados }) {
  const { usuario, atividades } = dados
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState<string | null>(null)
  const [modalSenha, setModalSenha]     = useState(false)
  const [novaSenha, setNovaSenha]       = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha]   = useState(false)
  const [erroSenha, setErroSenha]       = useState<string | null>(null)
  const [sucessoSenha, setSucessoSenha] = useState(false)
  const [form, setForm] = useState<FormFields>({
    nome_completo: usuario.nome_completo ?? '',
    cpf:           usuario.cpf           ?? '',
    telefone:      usuario.telefone      ?? '',
    endereco:      usuario.endereco      ?? '',
    municipio:     usuario.municipio     ?? '',
    estado:        usuario.estado        ?? '',
  })

  const org = usuario.organizacoes

  async function handleSalvar() {
    if (form.cpf.trim()) {
      const erroCpf = cpfInvalidoMsg(form.cpf)
      if (erroCpf) { setErro(erroCpf); return }
    }
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

  function abrirModalSenha() {
    setNovaSenha('')
    setConfirmarSenha('')
    setErroSenha(null)
    setSucessoSenha(false)
    setModalSenha(true)
  }

  function fecharModalSenha() {
    setModalSenha(false)
  }

  async function handleAlterarSenha() {
    if (novaSenha.length < 8) {
      setErroSenha('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha('As senhas não coincidem.')
      return
    }

    setSalvandoSenha(true)
    setErroSenha(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    setSalvandoSenha(false)

    if (error) {
      setErroSenha('Erro ao alterar senha: ' + error.message)
      return
    }

    // Limpa a flag de troca obrigatória (banner do layout) após a troca
    await supabase.auth.updateUser({ data: { trocar_senha: false } })

    setSucessoSenha(true)
    setNovaSenha('')
    setConfirmarSenha('')
    setTimeout(() => setModalSenha(false), 1800)
  }

  function cancelar() {
    setForm({
      nome_completo: usuario.nome_completo ?? '',
      cpf:           usuario.cpf           ?? '',
      telefone:      usuario.telefone      ?? '',
      endereco:      usuario.endereco      ?? '',
      municipio:     usuario.municipio     ?? '',
      estado:        usuario.estado        ?? '',
    })
    setErro(null)
    setEditando(false)
  }

  const subtitulo = [
    labelVinculo(usuario.vinculo),
    org?.nome,
    `Membro desde ${formatarMembroDesde(usuario.criado_em)}`,
  ].filter(Boolean).join(' · ')

  return (
    <PageLayout
      titulo="Meu Perfil"
      subtitulo={subtitulo}
      icone="ti-user"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[{ label: 'Meu Perfil' }]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', maxWidth: 960, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

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
                color: '#185FA5', flexShrink: 0, overflow: 'hidden',
              }}>
                {usuario.avatar_url
                  ? <img src={usuario.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : iniciais(usuario.nome_completo)
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {usuario.nome_completo}
                  </span>
                  <span style={{
                    background: '#EAF3DE', color: '#3B6D11',
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                  }}>
                    {labelFuncao(usuario.funcoes)}
                  </span>
                  {usuario.ativo && (
                    <span style={{
                      background: '#E6F1FB', color: '#185FA5',
                      fontSize: 11, padding: '2px 8px', borderRadius: 6,
                    }}>
                      ● Conta ativa
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                  {subtitulo}
                </div>
              </div>

              {!editando ? (
                <button
                  onClick={() => setEditando(true)}
                  style={{
                    background: 'none', border: '1px solid #e5e3dc', borderRadius: 8,
                    padding: '6px 12px', fontSize: 13, color: 'var(--color-text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  }}
                >
                  <i className="ti ti-edit" style={{ fontSize: 15 }} aria-hidden="true" /> Editar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={cancelar}
                    style={{
                      background: 'none', border: '1px solid #e5e3dc', borderRadius: 8,
                      padding: '6px 12px', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer',
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
                      cursor: salvando ? 'not-allowed' : 'pointer',
                      opacity: salvando ? 0.7 : 1, whiteSpace: 'nowrap',
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

              {editando ? (
                // MODO EDIÇÃO — todos os campos como inputs
                <div className="nxc-form-grid">
                  {campos.map(({ label, campo, colSpan }) => (
                    <div key={campo} style={colSpan ? { gridColumn: '1 / -1' } : {}}>
                      <div style={labelStyle}>{label}</div>
                      <input
                        value={form[campo]}
                        onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                  {/* E-mail: nunca editável (vem do auth) */}
                  <div>
                    <div style={labelStyle}>E-mail</div>
                    <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      {usuario.email ?? 'Não informado'}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      Não editável — vinculado à autenticação
                    </div>
                  </div>
                </div>
              ) : (
                // MODO LEITURA — só campos com valor
                <div className="nxc-form-grid">
                  {campos
                    .filter(({ campo }) => !!form[campo])
                    .map(({ label, campo, colSpan }) => (
                      <div key={campo} style={colSpan ? { gridColumn: '1 / -1' } : {}}>
                        <div style={labelStyle}>{label}</div>
                        <div style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
                          {form[campo]}
                        </div>
                      </div>
                    ))
                  }
                  {usuario.email && (
                    <div>
                      <div style={labelStyle}>E-mail</div>
                      <div style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
                        {usuario.email}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
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
                        <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                          {a.descricao ?? a.acao}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
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
              fontSize: 12, color: 'var(--color-text-tertiary)',
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
                { label: 'E-mail de assembleias', ativo: true  },
                { label: 'Alertas de captação',   ativo: true  },
                { label: 'Novidades do sistema',  ativo: false },
              ].map(n => (
                <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{n.label}</span>
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
              onClick={abrirModalSenha}
              style={{
                width: '100%', background: 'none', border: '1px solid #e5e3dc',
                borderRadius: 8, padding: '8px 12px', fontSize: 13,
                color: 'var(--color-text-secondary)', cursor: 'pointer',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <i className="ti ti-lock" style={{ fontSize: 15 }} aria-hidden="true" /> Alterar senha
            </button>
          </div>

        </div>
      </div>

      {modalSenha && (
        <div
          onClick={fecharModalSenha}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 12, padding: '1.5rem',
              width: '100%', maxWidth: 380, fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
              Alterar senha
            </div>

            {sucessoSenha ? (
              <div style={{
                background: '#f0faf6', border: '1px solid #6ee7b7', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, color: '#065f46',
              }}>
                ✅ Senha alterada com sucesso!
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={labelStyle}>Nova senha</div>
                  <CampoSenha value={novaSenha} onChange={setNovaSenha} placeholder="Mínimo 8 caracteres" />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={labelStyle}>Confirmar nova senha</div>
                  <CampoSenha value={confirmarSenha} onChange={setConfirmarSenha} placeholder="Repita a nova senha" />
                </div>

                {erroSenha && (
                  <div style={{
                    background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 8,
                    padding: '10px 14px', fontSize: 13, color: '#A32D2D', marginBottom: '1rem',
                  }}>
                    {erroSenha}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={fecharModalSenha}
                    style={{
                      background: 'none', border: '1px solid #e5e3dc', borderRadius: 8,
                      padding: '6px 14px', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAlterarSenha}
                    disabled={salvandoSenha}
                    style={{
                      background: '#378ADD', border: '1px solid #378ADD', borderRadius: 8,
                      padding: '6px 14px', fontSize: 13, color: 'white',
                      cursor: salvandoSenha ? 'not-allowed' : 'pointer',
                      opacity: salvandoSenha ? 0.7 : 1,
                    }}
                  >
                    {salvandoSenha ? 'Salvando...' : 'Salvar nova senha'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  )
}
