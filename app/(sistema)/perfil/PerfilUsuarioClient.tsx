'use client'

import { useState } from 'react'
import type { Usuario } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { CampoSenha } from '@/components/CampoSenha'

const FUNCAO_LABEL: Record<string, string> = {
  admin: 'Administrador',
  caixa_cacau: 'Operador de Caixa',
  tecnico: 'Técnico Agrícola',
  financeiro: 'Financeiro',
  conselho_fiscal: 'Conselho Fiscal',
  captador: 'Captador de Recursos',
  gerente_loja: 'Gerente de Loja',
  vendedor: 'Vendedor',
  contador: 'Contador',
}

const VINCULO_LABEL: Record<string, string> = {
  cooperado: 'Cooperado',
  funcionario: 'Funcionário',
  diretoria: 'Diretoria',
  externo: 'Externo',
}

const MODULOS = [
  { key: 'comercializacao', label: 'Comercialização', cor: '#92400e', funcoes: ['admin', 'caixa_cacau'] },
  { key: 'captacao', label: 'Captação', cor: '#1D9E75', funcoes: ['admin', 'captador'] },
  { key: 'financeiro', label: 'Financeiro', cor: '#0F766E', funcoes: ['admin', 'financeiro'] },
  { key: 'loja', label: 'Loja', cor: '#E07B30', funcoes: ['admin', 'gerente_loja', 'vendedor'] },
]

function getFuncaoLabel(funcoes: string[]): string {
  if (funcoes.includes('admin')) return FUNCAO_LABEL['admin']
  for (const f of funcoes) {
    if (FUNCAO_LABEL[f]) return FUNCAO_LABEL[f]
  }
  return funcoes[0] ?? 'Usuário'
}

function getInitials(nome: string): string {
  return nome.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtMesBr(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e3dc',
  borderRadius: 12,
  padding: '1.25rem',
  marginBottom: 14,
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: '#9ca3af',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: '0 0 12px',
  paddingBottom: 10,
  borderBottom: '1px solid #e5e3dc',
}

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  color: '#6b7280',
  display: 'block',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #e5e3dc',
  borderRadius: 8,
  fontSize: 13,
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
}

const inputDisabled: React.CSSProperties = {
  ...inputStyle,
  background: '#f9fafb',
  color: '#6b7280',
  cursor: 'default',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '9px 0',
  borderBottom: '1px solid #f3f4f6',
}

export default function PerfilUsuarioClient({
  usuario,
  email,
  orgNome,
}: {
  usuario: Usuario | null
  email: string
  orgNome: string
}) {
  const funcoes: string[] = usuario?.funcoes ?? []
  const vinculo = usuario?.vinculo ?? ''

  const [nome, setNome] = useState(usuario?.nome_completo ?? '')
  const [telefone, setTelefone] = useState(usuario?.telefone ?? '')
  const [cpf, setCpf] = useState(usuario?.cpf ?? '')
  const [endereco, setEndereco] = useState((usuario as any)?.endereco ?? '')
  const [municipio, setMunicipio] = useState((usuario as any)?.municipio ?? '')
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [alterando, setAlterando] = useState(false)
  const [sucessoSenha, setSucessoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [senhaAlterada, setSenhaAlterada] = useState(false)
  const [mostrarFormSenha, setMostrarFormSenha] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro(''); setSucesso(false)
    const res = await fetch('/api/usuarios/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome_completo: nome.trim(),
        telefone: telefone || null,
        cpf: cpf || null,
        endereco: endereco || null,
        municipio: municipio || null,
      }),
    })
    setSalvando(false)
    if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro ao salvar.'); return }
    setSucesso(true)
    setTimeout(() => setSucesso(false), 2500)
  }

  async function handleAlterarSenha() {
    setErroSenha(''); setSucessoSenha(false)
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) { setErroSenha('Preencha todos os campos.'); return }
    if (novaSenha.length < 8) { setErroSenha('A nova senha deve ter no mínimo 8 caracteres.'); return }
    if (novaSenha !== confirmarNovaSenha) { setErroSenha('A nova senha e a confirmação não coincidem.'); return }
    setAlterando(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: senhaAtual })
    if (signInError) { setAlterando(false); setErroSenha('Senha atual incorreta.'); return }
    const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha })
    setAlterando(false)
    if (updateError) { setErroSenha('Erro ao alterar senha: ' + updateError.message); return }
    setSucessoSenha(true); setSenhaAlterada(true)
    setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha('')
  }

  const modulosAtivos = MODULOS.filter(m => m.funcoes.some(f => funcoes.includes(f)))
  const modulosInativos = MODULOS.filter(m => !m.funcoes.some(f => funcoes.includes(f)))

  return (
    <div style={{ maxWidth: 900, fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: '#111827' }}>Meu perfil</h1>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#14532d', fontWeight: 500 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          Conta ativa
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 16 }}>

        {/* COLUNA ESQUERDA */}
        <div>
          <form onSubmit={handleSubmit}>
            <div style={card}>

              {/* Avatar + nome + função */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: '#fef3c7', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 22, fontWeight: 500,
                  color: '#92400e', flexShrink: 0, position: 'relative',
                }}>
                  {getInitials(nome)}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#92400e', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff',
                  }} title="Foto em breve">+</div>
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 5px', color: '#111827' }}>{nome || '—'}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontWeight: 500 }}>
                      {getFuncaoLabel(funcoes)}
                    </span>
                    {vinculo && (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#f3f4f6', color: '#374151', fontWeight: 500 }}>
                        {VINCULO_LABEL[vinculo] ?? vinculo} · {orgNome}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p style={sectionLabel}>Dados pessoais</p>

              {erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
                  {erro}
                </div>
              )}

              <div style={{ marginBottom: 10 }}>
                <label style={fieldLabel}>Nome completo *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={fieldLabel}>CPF</label>
                  <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" style={inputStyle} />
                </div>
                <div>
                  <label style={fieldLabel}>Telefone</label>
                  <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(73) 99999-0000" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={fieldLabel}>E-mail</label>
                <input value={email} disabled style={inputDisabled} />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={fieldLabel}>Endereço</label>
                <input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, número, bairro" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 4 }}>
                <div>
                  <label style={fieldLabel}>Município</label>
                  <input value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="Ibirataia" style={inputStyle} />
                </div>
                <div>
                  <label style={fieldLabel}>Estado</label>
                  <input defaultValue="BA" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="submit" disabled={salvando} style={{
                  background: '#92400e', color: '#fff', border: 'none',
                  padding: '8px 18px', borderRadius: 8, fontSize: 13,
                  fontWeight: 500, cursor: 'pointer',
                  opacity: salvando ? 0.7 : 1,
                }}>
                  {salvando ? 'Salvando...' : sucesso ? '✓ Salvo' : 'Salvar dados'}
                </button>
              </div>
            </div>
          </form>

          {/* Segurança */}
          <div style={card}>
            <p style={sectionLabel}>Segurança</p>
            <div style={{ ...rowStyle, borderBottom: 'none', paddingBottom: 0 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', color: '#111827' }}>Senha</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>••••••••••</p>
              </div>
              {!mostrarFormSenha && !senhaAlterada && (
                <button
                  onClick={() => setMostrarFormSenha(true)}
                  style={{ background: '#fff', color: '#374151', border: '1px solid #e5e3dc', padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  Trocar senha
                </button>
              )}
            </div>

            {mostrarFormSenha && !senhaAlterada && (
              <div style={{ marginTop: 14 }}>
                <CampoSenha placeholder="Senha atual" value={senhaAtual} onChange={setSenhaAtual} style={{ marginBottom: 8 }} />
                <CampoSenha placeholder="Nova senha" value={novaSenha} onChange={setNovaSenha} style={{ marginBottom: 8 }} />
                <CampoSenha placeholder="Confirmar nova senha" value={confirmarNovaSenha} onChange={setConfirmarNovaSenha} style={{ marginBottom: 12 }} />
                {erroSenha && <p style={{ fontSize: 13, color: '#dc2626', margin: '0 0 10px' }}>{erroSenha}</p>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setMostrarFormSenha(false); setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha(''); setErroSenha('') }}
                    style={{ background: '#fff', color: '#374151', border: '1px solid #e5e3dc', padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleAlterarSenha} disabled={alterando}
                    style={{ background: '#92400e', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: alterando ? 0.7 : 1 }}>
                    {alterando ? 'Salvando...' : 'Salvar nova senha'}
                  </button>
                </div>
              </div>
            )}

            {senhaAlterada && (
              <div style={{ marginTop: 12, background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#14532d', fontWeight: 500 }}>
                ✓ Senha alterada com sucesso
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div>

          {/* Vínculo */}
          <div style={card}>
            <p style={sectionLabel}>Vínculo com a organização</p>
            {[
              { label: 'Organização', value: orgNome || '—' },
              { label: 'Função', value: getFuncaoLabel(funcoes), badge: true },
              { label: 'Vínculo', value: vinculo ? (VINCULO_LABEL[vinculo] ?? vinculo) : '—' },
              { label: 'Desde', value: usuario?.criado_em ? fmtMesBr(usuario.criado_em) : '—' },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ ...rowStyle, borderBottom: i === arr.length - 1 ? 'none' : '1px solid #f3f4f6', paddingBottom: i === arr.length - 1 ? 0 : undefined }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{r.label}</span>
                {r.badge ? (
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontWeight: 500 }}>
                    {r.value}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{r.value}</span>
                )}
              </div>
            ))}
          </div>

          {/* Módulos com acesso */}
          <div style={card}>
            <p style={sectionLabel}>Módulos com acesso</p>
            {modulosAtivos.map(m => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#f9fafb', marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.cor, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: 11, color: '#14532d', background: '#dcfce7', padding: '2px 8px', borderRadius: 20 }}>Ativo</span>
              </div>
            ))}
            {modulosInativos.map(m => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#f9fafb', marginBottom: 6, opacity: 0.4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#6b7280', flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 20 }}>Sem acesso</span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0' }}>Acesso gerenciado pelo administrador.</p>
          </div>

          {/* Notificações */}
          <div style={card}>
            <p style={sectionLabel}>Notificações</p>
            {[
              { label: 'Solicitações de aporte', sub: 'Quando um operador solicitar aporte' },
              { label: 'Fechamento de caixa', sub: 'Resumo ao fechar sessão' },
              { label: 'Alertas de prazo', sub: 'Editais com prazo próximo' },
            ].map((n, i, arr) => (
              <div key={n.label} style={{ ...rowStyle, borderBottom: i === arr.length - 1 ? 'none' : '1px solid #f3f4f6', paddingBottom: i === arr.length - 1 ? 0 : undefined, alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, color: '#111827', margin: '0 0 2px' }}>{n.label}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{n.sub}</p>
                </div>
                <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, flexShrink: 0 }}>em breve</span>
              </div>
            ))}
          </div>

          {/* Atividade recente */}
          <div style={card}>
            <p style={sectionLabel}>Atividade recente</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>Último acesso</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>
                  {usuario?.ultimo_acesso ? fmtDataHora(usuario.ultimo_acesso) : 'hoje'}
                </p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>Membro desde</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>
                  {usuario?.criado_em ? fmtMesBr(usuario.criado_em) : '—'}
                </p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
              Histórico detalhado de login — em breve.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
