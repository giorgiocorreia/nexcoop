'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FuncaoDisponivel, Usuario, VinculoUsuario } from '@/types/database'
import type { UsuarioPendente } from './page'
import { atualizarUsuario, convidarUsuario, toggleAtivo, ativarConvite, reenviarConvite, revogarConvite, redefinirSenhaUsuario } from './actions'
import { Btn } from '@/components/ui/Btn'
import { criarUsuarioComCooperadoOpcional, enviarEmailBoasVindas, vincularUsuarioComoCooperado } from '@/lib/cooperados/actions'

const GREEN = '#635BFF'
const GREEN_DARK = '#4840CC'

const VINCULO_OPTIONS: { value: VinculoUsuario; label: string }[] = [
  { value: 'cooperado',   label: 'Cooperado' },
  { value: 'funcionario', label: 'Funcionário' },
  { value: 'diretoria',   label: 'Diretoria' },
  { value: 'externo',     label: 'Externo' },
]

const VINCULO_LABEL: Record<string, string> = {
  cooperado: 'Cooperado', funcionario: 'Funcionário', diretoria: 'Diretoria', externo: 'Externo',
}

const FUNCAO_LABEL: Record<string, string> = {
  admin: 'Administrador', financeiro: 'Financeiro', tecnico: 'Técnico',
  conselho_fiscal: 'Conselho Fiscal', captador: 'Captador',
  caixa_cacau: 'Caixa Cacau', gerente_loja: 'Gerente Loja',
  caixa_loja: 'Operador de Caixa (Loja)', estoquista_loja: 'Estoquista Loja',
}

interface Props {
  usuarios: Usuario[]
  pendentes: UsuarioPendente[]
  funcoes: FuncaoDisponivel[]
  usuarioAtualId: string
  isSuperAdmin: boolean
  organizacaoId: string | null
  nomeOrg: string | null
  embeddedMode?: boolean
  usuariosComCooperado: string[]
}

export default function UsuariosGestao({ usuarios: usuariosInit, pendentes: pendentesInit, funcoes, usuarioAtualId, isSuperAdmin, organizacaoId, nomeOrg, embeddedMode, usuariosComCooperado }: Props) {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState(usuariosInit)
  const [pendentes, setPendentes] = useState(pendentesInit)
  const [busca, setBusca] = useState('')

  // Convite
  const [conviteAberto, setConviteAberto] = useState(false)
  const [convite, setConvite] = useState({ nome: '', email: '', vinculo: '', funcoes: [] as string[] })
  const [enviandoConvite, setEnviandoConvite] = useState(false)
  const [erroConvite, setErroConvite] = useState('')
  const [okConvite, setOkConvite] = useState('')

  // Cadastro direto
  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [cadastro, setCadastro] = useState({ nome: '', email: '', cpf: '', vinculo: '', funcoes: [] as string[] })
  const [enviandoCadastro, setEnviandoCadastro] = useState(false)
  const [erroCadastro, setErroCadastro] = useState('')
  const [okCadastro, setOkCadastro] = useState('')
  const [credenciais, setCredenciais] = useState<{ email: string; senha: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [enviandoEmailBV, setEnviandoEmailBV] = useState(false)
  const [emailBVEnviado, setEmailBVEnviado] = useState(false)
  const [erroEmailBV, setErroEmailBV] = useState('')

  // Edição inline
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ funcoes: [] as string[], vinculo: '' })
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [erroEditar, setErroEditar] = useState('')

  // Toggle ativo
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [erroToggle, setErroToggle] = useState('')

  // Redefinição de senha
  const [redefinindoId, setRedefinindoId] = useState<string | null>(null)
  const [okRedefinir, setOkRedefinir] = useState('')
  const [erroRedefinir, setErroRedefinir] = useState('')

  // Ações nos pendentes
  const [ativandoId, setAtivandoId] = useState<string | null>(null)
  const [reenviandoId, setReenviandoId] = useState<string | null>(null)
  const [revogandoId, setRevogandoId] = useState<string | null>(null)
  const [erroPendente, setErroPendente] = useState('')

  // Modal de ativação com senha
  const [modalAtivar, setModalAtivar] = useState<UsuarioPendente | null>(null)
  const [senhaAtivar, setSenhaAtivar] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [salvandoAtivar, setSalvandoAtivar] = useState(false)

  // Modal "Tornar Cooperado"
  const [modalCooperadoUsuario, setModalCooperadoUsuario] = useState<Usuario | null>(null)
  const [formCooperado, setFormCooperado] = useState({
    numero_matricula: '',
    data_admissao: '',
    quota_parte: '',
    caf_numero: '',
    dap_numero: '',
    status: 'ativo',
  })
  const [salvandoCooperado, setSalvandoCooperado] = useState(false)
  const [erroCooperado, setErroCooperado] = useState('')
  const [okCooperado, setOkCooperado] = useState('')

  const cooperadoSet = useMemo(() => new Set(usuariosComCooperado), [usuariosComCooperado])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    const lista = q
      ? usuarios.filter(u => u.nome_completo.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : [...usuarios]
    return lista.sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1
      return a.nome_completo.localeCompare(b.nome_completo, 'pt-BR')
    })
  }, [usuarios, busca])

  const filtradosPendentes = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q) return pendentes
    return pendentes.filter(p => p.nome_completo.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [pendentes, busca])

  const totalAtivos = usuarios.filter(u => u.ativo).length

  function abrirEdicao(u: Usuario) {
    setEditandoId(u.id)
    setEditForm({ funcoes: [...(u.funcoes ?? [])], vinculo: u.vinculo ?? '' })
    setErroEditar('')
  }

  function toggleFuncaoEdit(nome: string) {
    setEditForm(prev => ({
      ...prev,
      funcoes: prev.funcoes.includes(nome)
        ? prev.funcoes.filter(f => f !== nome)
        : [...prev.funcoes, nome],
    }))
  }

  function toggleFuncaoConvite(nome: string) {
    setConvite(prev => ({
      ...prev,
      funcoes: prev.funcoes.includes(nome)
        ? prev.funcoes.filter(f => f !== nome)
        : [...prev.funcoes, nome],
    }))
  }

  async function salvarEdicao(id: string) {
    setSalvandoId(id)
    setErroEditar('')
    const res = await atualizarUsuario(id, {
      funcoes: editForm.funcoes,
      vinculo: (editForm.vinculo || null) as VinculoUsuario | null,
    })
    setSalvandoId(null)
    if (res.error) { setErroEditar(res.error); return }
    setUsuarios(prev => prev.map(u =>
      u.id === id ? { ...u, funcoes: editForm.funcoes, vinculo: (editForm.vinculo || null) as VinculoUsuario | null } : u
    ))
    setEditandoId(null)
    router.refresh()
  }

  async function handleToggleAtivo(id: string, ativoAtual: boolean) {
    setTogglingId(id)
    setErroToggle('')
    const res = await toggleAtivo(id, !ativoAtual)
    setTogglingId(null)
    if (res.error) { setErroToggle(res.error); return }
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: !ativoAtual } : u))
  }

  async function handleRedefinirSenha(u: Usuario) {
    if (!confirm(`Enviar e-mail de redefinição de senha para ${u.nome_completo}?`)) return
    setRedefinindoId(u.id)
    setErroRedefinir('')
    setOkRedefinir('')
    const res = await redefinirSenhaUsuario(u.id, u.email)
    setRedefinindoId(null)
    if (res.error) { setErroRedefinir(res.error); return }
    setOkRedefinir(`E-mail de redefinição enviado para ${u.email}.`)
    setTimeout(() => setOkRedefinir(''), 5000)
  }

  async function handleConvidar() {
    if (!convite.nome.trim()) { setErroConvite('Informe o nome.'); return }
    if (!convite.email.trim()) { setErroConvite('Informe o e-mail.'); return }
    setEnviandoConvite(true)
    setErroConvite('')
    setOkConvite('')
    const res = await convidarUsuario({ ...convite, vinculo: convite.vinculo as VinculoUsuario | '' })
    setEnviandoConvite(false)
    if (res.error) { setErroConvite(res.error); return }
    setOkConvite(`Convite enviado para ${convite.email}.`)
    setConvite({ nome: '', email: '', vinculo: '', funcoes: [] })
    setTimeout(() => { setOkConvite(''); setConviteAberto(false) }, 4000)
    router.refresh()
  }

  async function handleAtivar() {
    if (!modalAtivar) return
    if (!senhaAtivar.trim() || senhaAtivar.length < 6) {
      setErroSenha('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setSalvandoAtivar(true)
    setErroSenha('')
    const res = await ativarConvite(modalAtivar.id, senhaAtivar)
    setSalvandoAtivar(false)
    if (res.error) { setErroSenha(res.error); return }
    setModalAtivar(null)
    setSenhaAtivar('')
    router.refresh()
  }

  async function handleReenviar(p: UsuarioPendente) {
    setReenviandoId(p.id)
    setErroPendente('')
    const res = await reenviarConvite(p.email)
    setReenviandoId(null)
    if (res.error) { setErroPendente(res.error); return }
  }

  async function handleRevogar(p: UsuarioPendente) {
    if (!confirm(`Revogar convite de ${p.nome_completo}? O usuário será removido.`)) return
    setRevogandoId(p.id)
    setErroPendente('')
    const res = await revogarConvite(p.id)
    setRevogandoId(null)
    if (res.error) { setErroPendente(res.error); return }
    setPendentes(prev => prev.filter(x => x.id !== p.id))
  }

  function toggleFuncaoCadastro(nome: string) {
    setCadastro(prev => ({
      ...prev,
      funcoes: prev.funcoes.includes(nome)
        ? prev.funcoes.filter(f => f !== nome)
        : [...prev.funcoes, nome],
    }))
  }

  async function handleCadastrar() {
    if (!cadastro.nome.trim()) { setErroCadastro('Informe o nome.'); return }
    if (!cadastro.email.trim()) { setErroCadastro('Informe o e-mail.'); return }
    if (!cadastro.vinculo) { setErroCadastro('Selecione o vínculo.'); return }
    if (!organizacaoId) { setErroCadastro('Organização não encontrada.'); return }
    setEnviandoCadastro(true)
    setErroCadastro('')
    const res = await criarUsuarioComCooperadoOpcional(organizacaoId, {
      nome: cadastro.nome.trim(),
      email: cadastro.email.trim(),
      cpf: '',
      funcoes: cadastro.funcoes,
      vinculo: cadastro.vinculo,
      ehCooperado: false,
    })
    setEnviandoCadastro(false)
    if (!res.success) { setErroCadastro(res.error ?? 'Erro ao cadastrar.'); return }
    setCredenciais({ email: cadastro.email.trim(), senha: res.senhaTemporaria })
  }

  async function handleEnviarEmailBoasVindas() {
    if (!credenciais) return
    setEnviandoEmailBV(true)
    setErroEmailBV('')
    const res = await enviarEmailBoasVindas({
      nomeCooperado: cadastro.nome.trim(),
      emailCooperado: credenciais.email,
      senhaTemporaria: credenciais.senha,
      nomeOrg: nomeOrg ?? 'sua organização',
      tipoMembro: cadastro.vinculo || 'membro',
    })
    setEnviandoEmailBV(false)
    if (res.success) {
      setEmailBVEnviado(true)
    } else {
      setErroEmailBV(res.error ?? 'Erro ao enviar e-mail.')
    }
  }

  async function copiarCredenciais() {
    if (!credenciais) return
    await navigator.clipboard.writeText(`E-mail: ${credenciais.email}\nSenha temporária: ${credenciais.senha}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function fecharCadastro() {
    setCadastroAberto(false)
    setCadastro({ nome: '', email: '', cpf: '', vinculo: '', funcoes: [] })
    setErroCadastro('')
    setOkCadastro('')
    setCredenciais(null)
    setCopiado(false)
    setEnviandoEmailBV(false)
    setEmailBVEnviado(false)
    setErroEmailBV('')
  }

  async function handleTornarCooperado() {
    if (!modalCooperadoUsuario || !organizacaoId) return
    setSalvandoCooperado(true)
    setErroCooperado('')
    const res = await vincularUsuarioComoCooperado(organizacaoId, {
      usuarioId: modalCooperadoUsuario.id,
      nome: modalCooperadoUsuario.nome_completo,
      cpf: modalCooperadoUsuario.cpf ?? '',
      email: modalCooperadoUsuario.email,
      telefone: modalCooperadoUsuario.telefone ?? undefined,
      numero_matricula: formCooperado.numero_matricula || undefined,
      data_admissao: formCooperado.data_admissao || undefined,
      quota_parte: formCooperado.quota_parte ? Number(formCooperado.quota_parte) : undefined,
      caf_numero: formCooperado.caf_numero || undefined,
      dap_numero: formCooperado.dap_numero || undefined,
      status: formCooperado.status as any,
    })
    setSalvandoCooperado(false)
    if (!res.success) { setErroCooperado(res.error ?? 'Erro ao vincular.'); return }
    setOkCooperado('Cooperado criado com sucesso!')
    setTimeout(() => {
      setModalCooperadoUsuario(null)
      setOkCooperado('')
      setFormCooperado({ numero_matricula: '', data_admissao: '', quota_parte: '', caf_numero: '', dap_numero: '', status: 'ativo' })
      router.refresh()
    }, 1500)
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Modal de ativação */}
      {modalAtivar && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }} onClick={() => { setModalAtivar(null); setSenhaAtivar(''); setErroSenha('') }}>
          <div style={{
            background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '400px',
            padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
              Ativar usuário
            </div>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '1.25rem' }}>
              {modalAtivar.nome_completo} · {modalAtivar.email}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                Senha inicial <span style={{ color: '#dc2626' }}>*</span>
              </div>
              <input
                type="password"
                value={senhaAtivar}
                onChange={e => setSenhaAtivar(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoFocus
                style={inp}
                onFocus={e => e.target.style.borderColor = GREEN}
                onBlur={e => e.target.style.borderColor = '#d5d3cc'}
              />
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                O usuário poderá trocar a senha nas configurações de conta.
              </div>
            </div>
            {erroSenha && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>
                {erroSenha}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setModalAtivar(null); setSenhaAtivar(''); setErroSenha('') }}
                style={{ padding: '8px 16px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAtivar}
                disabled={salvandoAtivar}
                style={{
                  padding: '8px 18px', border: 'none', borderRadius: '8px',
                  background: salvandoAtivar ? '#9F9BFF' : GREEN,
                  color: '#fff', fontSize: '13px', fontWeight: '600',
                  cursor: salvandoAtivar ? 'not-allowed' : 'pointer',
                }}
              >
                {salvandoAtivar ? 'Ativando...' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tornar Cooperado */}
      {modalCooperadoUsuario && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }} onClick={() => setModalCooperadoUsuario(null)}>
          <div style={{
            background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '480px',
            padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
              Tornar Cooperado
            </div>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '1.25rem' }}>
              {modalCooperadoUsuario.nome_completo} · {modalCooperadoUsuario.email}
            </div>

            {okCooperado ? (
              <div style={{ background: '#E6F7F1', border: '1px solid #1D9E7533', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#166534', textAlign: 'center' }}>
                ✓ {okCooperado}
              </div>
            ) : (
              <>
                {erroCooperado && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#dc2626', marginBottom: '1rem' }}>
                    {erroCooperado}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <FieldLabel>Matrícula</FieldLabel>
                    <input
                      value={formCooperado.numero_matricula}
                      onChange={e => setFormCooperado(p => ({ ...p, numero_matricula: e.target.value }))}
                      placeholder="Gerada automaticamente"
                      style={inp}
                      onFocus={e => e.target.style.borderColor = GREEN}
                      onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                    />
                  </div>
                  <div>
                    <FieldLabel>Data de admissão</FieldLabel>
                    <input
                      type="date"
                      value={formCooperado.data_admissao}
                      onChange={e => setFormCooperado(p => ({ ...p, data_admissao: e.target.value }))}
                      style={inp}
                      onFocus={e => e.target.style.borderColor = GREEN}
                      onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                    />
                  </div>
                  <div>
                    <FieldLabel>Quota parte (R$)</FieldLabel>
                    <input
                      type="number"
                      value={formCooperado.quota_parte}
                      onChange={e => setFormCooperado(p => ({ ...p, quota_parte: e.target.value }))}
                      placeholder="0,00"
                      style={inp}
                      onFocus={e => e.target.style.borderColor = GREEN}
                      onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                    />
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <select
                      value={formCooperado.status}
                      onChange={e => setFormCooperado(p => ({ ...p, status: e.target.value }))}
                      style={{ ...inp, background: '#fff' }}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                      <option value="suspenso">Suspenso</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>CAF</FieldLabel>
                    <input
                      value={formCooperado.caf_numero}
                      onChange={e => setFormCooperado(p => ({ ...p, caf_numero: e.target.value }))}
                      placeholder="Número do CAF"
                      style={inp}
                      onFocus={e => e.target.style.borderColor = GREEN}
                      onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                    />
                  </div>
                  <div>
                    <FieldLabel>DAP</FieldLabel>
                    <input
                      value={formCooperado.dap_numero}
                      onChange={e => setFormCooperado(p => ({ ...p, dap_numero: e.target.value }))}
                      placeholder="Número da DAP"
                      style={inp}
                      onFocus={e => e.target.style.borderColor = GREEN}
                      onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    onClick={() => setModalCooperadoUsuario(null)}
                    style={{ padding: '8px 16px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleTornarCooperado}
                    disabled={salvandoCooperado}
                    style={{
                      padding: '8px 18px', border: 'none', borderRadius: '8px',
                      background: salvandoCooperado ? '#9F9BFF' : GREEN,
                      color: '#fff', fontSize: '13px', fontWeight: '600',
                      cursor: salvandoCooperado ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {salvandoCooperado ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {!embeddedMode && <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Usuários</h1>}
          <p style={{ fontSize: '13px', color: '#888', marginTop: embeddedMode ? 0 : '4px', marginBottom: 0 }}>
            {totalAtivos} membro{totalAtivos !== 1 ? 's' : ''} ativo{totalAtivos !== 1 ? 's' : ''}
            {usuarios.length > totalAtivos && ` · ${usuarios.length - totalAtivos} inativo${usuarios.length - totalAtivos !== 1 ? 's' : ''}`}
            {pendentes.length > 0 && ` · ${pendentes.length} aguardando aceite`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn
            variante={cadastroAberto ? 'cinza' : 'azul'}
            icone={cadastroAberto ? undefined : 'ti-user-plus'}
            onClick={() => { fecharCadastro(); setCadastroAberto(v => !v) }}
            disabled={!organizacaoId}
          >
            {cadastroAberto ? 'Cancelar' : '+ Cadastrar usuário'}
          </Btn>
          <Btn
            variante={conviteAberto ? 'cinza' : 'azul'}
            icone={conviteAberto ? undefined : 'ti-mail'}
            onClick={() => { setConviteAberto(v => !v); setErroConvite(''); setOkConvite('') }}
          >
            {conviteAberto ? 'Cancelar' : '+ Convidar usuário'}
          </Btn>
        </div>
      </div>

      {/* Erros globais */}
      {erroToggle    && <Alerta tipo="erro" style={{ marginBottom: '1rem' }}>{erroToggle}</Alerta>}
      {erroRedefinir && <Alerta tipo="erro" style={{ marginBottom: '1rem' }}>{erroRedefinir}</Alerta>}
      {okRedefinir   && <Alerta tipo="ok"  style={{ marginBottom: '1rem' }}>✓ {okRedefinir}</Alerta>}
      {erroPendente && <Alerta tipo="erro" style={{ marginBottom: '1rem' }}>{erroPendente}</Alerta>}

      {/* Formulário de convite */}
      {conviteAberto && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>Convidar novo usuário</div>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '-8px', marginBottom: '1rem' }}>
            O usuário receberá um e-mail com o link de acesso.
          </p>

          {erroConvite && <Alerta tipo="erro" style={{ marginBottom: '12px' }}>{erroConvite}</Alerta>}
          {okConvite   && <Alerta tipo="ok"  style={{ marginBottom: '12px' }}>✓ {okConvite}</Alerta>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <FieldLabel required>Nome completo</FieldLabel>
              <input
                value={convite.nome}
                onChange={e => setConvite(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome do usuário"
                style={inp}
                onFocus={e => e.target.style.borderColor = GREEN}
                onBlur={e => e.target.style.borderColor = '#d5d3cc'}
              />
            </div>
            <div>
              <FieldLabel required>E-mail</FieldLabel>
              <input
                type="email"
                value={convite.email}
                onChange={e => setConvite(p => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
                style={inp}
                onFocus={e => e.target.style.borderColor = GREEN}
                onBlur={e => e.target.style.borderColor = '#d5d3cc'}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <FieldLabel>Vínculo</FieldLabel>
            <select
              value={convite.vinculo}
              onChange={e => setConvite(p => ({ ...p, vinculo: e.target.value }))}
              style={{ ...inp, width: '220px' }}
            >
              <option value="">Selecionar...</option>
              {VINCULO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <FieldLabel>Funções</FieldLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {funcoes.map(f => {
                const sel = convite.funcoes.includes(f.nome)
                return (
                  <button
                    key={f.nome} type="button"
                    onClick={() => toggleFuncaoConvite(f.nome)}
                    style={{
                      fontSize: '12px', padding: '4px 12px', borderRadius: '12px',
                      border: `1px solid ${sel ? GREEN : '#d5d3cc'}`,
                      background: sel ? '#EEF0FF' : '#fff',
                      color: sel ? GREEN_DARK : '#555',
                      cursor: 'pointer', fontWeight: sel ? '600' : '400',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleConvidar}
            disabled={enviandoConvite}
            style={{
              padding: '9px 20px', background: enviandoConvite ? '#9F9BFF' : GREEN,
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: '600',
              cursor: enviandoConvite ? 'not-allowed' : 'pointer',
            }}
          >
            {enviandoConvite ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>
      )}

      {/* Painel de cadastro direto */}
      {cadastroAberto && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>Cadastrar usuário</div>
          <p style={{ fontSize: '12px', color: '#888', marginTop: 0, marginBottom: '1rem' }}>
            Usuário criado imediatamente com senha temporária — sem necessidade de confirmação de e-mail.
          </p>

          {!credenciais ? (
            <>
              {erroCadastro && <Alerta tipo="erro" style={{ marginBottom: '12px' }}>{erroCadastro}</Alerta>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <FieldLabel required>Nome completo</FieldLabel>
                  <input
                    value={cadastro.nome}
                    onChange={e => setCadastro(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome do usuário"
                    style={inp}
                    onFocus={e => e.target.style.borderColor = GREEN}
                    onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                  />
                </div>
                <div>
                  <FieldLabel required>E-mail</FieldLabel>
                  <input
                    type="email"
                    value={cadastro.email}
                    onChange={e => setCadastro(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    style={inp}
                    onFocus={e => e.target.style.borderColor = GREEN}
                    onBlur={e => e.target.style.borderColor = '#d5d3cc'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <FieldLabel required>Vínculo</FieldLabel>
                <select
                  value={cadastro.vinculo}
                  onChange={e => setCadastro(p => ({ ...p, vinculo: e.target.value }))}
                  style={{ ...inp, width: '220px' }}
                >
                  <option value="">Selecionar...</option>
                  {VINCULO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <FieldLabel>Funções</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {funcoes.map(f => {
                    const sel = cadastro.funcoes.includes(f.nome)
                    return (
                      <button
                        key={f.nome} type="button"
                        onClick={() => toggleFuncaoCadastro(f.nome)}
                        style={{
                          fontSize: '12px', padding: '4px 12px', borderRadius: '12px',
                          border: `1px solid ${sel ? GREEN : '#d5d3cc'}`,
                          background: sel ? '#EEF0FF' : '#fff',
                          color: sel ? GREEN_DARK : '#555',
                          cursor: 'pointer', fontWeight: sel ? '600' : '400',
                        }}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCadastrar}
                disabled={enviandoCadastro}
                style={{
                  padding: '9px 20px', background: enviandoCadastro ? '#9F9BFF' : GREEN,
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '600',
                  cursor: enviandoCadastro ? 'not-allowed' : 'pointer',
                }}
              >
                {enviandoCadastro ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </>
          ) : (
            <div>
              <div style={{ background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#9a9a9a', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Credenciais para repassar ao usuário
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#888' }}>E-mail:</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginLeft: '8px' }}>{credenciais.email}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#888' }}>Senha temporária:</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginLeft: '8px', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                      {credenciais.senha}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFF8E1', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#92400e', marginBottom: '1rem' }}>
                ⚠️ Anote e repasse pessoalmente — esta senha não será exibida novamente.
              </div>

              {erroEmailBV && <Alerta tipo="erro" style={{ marginBottom: '8px' }}>{erroEmailBV}</Alerta>}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                <Btn variante="cinza" icone="ti-copy" onClick={copiarCredenciais}>
                  {copiado ? 'Copiado!' : 'Copiar credenciais'}
                </Btn>
                {emailBVEnviado ? (
                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: 500, alignSelf: 'center' }}>✓ E-mail enviado</span>
                ) : (
                  <Btn variante="cinza" icone="ti-mail" onClick={handleEnviarEmailBoasVindas} disabled={enviandoEmailBV}>
                    {enviandoEmailBV ? 'Enviando...' : 'Enviar por e-mail'}
                  </Btn>
                )}
                <Btn variante="azul" onClick={() => { fecharCadastro(); router.refresh() }}>
                  Fechar
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Busca */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          style={{ ...inp, background: '#fff' }}
          onFocus={e => e.target.style.borderColor = GREEN}
          onBlur={e => e.target.style.borderColor = '#d5d3cc'}
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 && filtradosPendentes.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
          padding: '3rem', textAlign: 'center', color: '#888', fontSize: '13px',
        }}>
          {busca ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
        </div>
      ) : (
        <>
          {filtrados.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
              {filtrados.map((u, i) => {
                const isSelf          = u.id === usuarioAtualId
                const isSuperAdminRow = u.role === 'super_admin'
                const podeEditar      = !isSuperAdminRow
                const editando        = editandoId === u.id
                const toggling        = togglingId === u.id
                const salvando        = salvandoId === u.id
                const iniciais        = u.nome_completo.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

                return (
                  <div key={u.id}>
                    {i > 0 && <div style={{ borderTop: '1px solid #f0eeea' }} />}
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flexShrink: 0 }}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: u.ativo ? GREEN : '#ccc',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: '700', flexShrink: 0,
                          }}>
                            {iniciais}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {u.nome_completo}
                          {isSelf && <span style={{ fontSize: '10px', fontWeight: '500', padding: '1px 7px', borderRadius: '8px', background: '#f0eeea', color: '#888' }}>Você</span>}
                          {isSuperAdminRow && <span style={{ fontSize: '10px', fontWeight: '600', padding: '1px 7px', borderRadius: '8px', background: '#fff3cd', color: '#92400e' }}>Super Admin</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flexShrink: 0, maxWidth: '260px' }}>
                        {u.vinculo && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#f0eeea', color: '#555', fontWeight: '500', whiteSpace: 'nowrap' }}>
                            {VINCULO_LABEL[u.vinculo] ?? u.vinculo}
                          </span>
                        )}
                        {(u.funcoes ?? []).map(f => (
                          <span key={f} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#EEF0FF', color: GREEN_DARK, fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {FUNCAO_LABEL[f] ?? f}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '500', whiteSpace: 'nowrap',
                          background: u.ativo ? '#E6F7F1' : '#f0eeea',
                          color: u.ativo ? '#166534' : '#888',
                        }}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        {podeEditar && (
                          <>
                            <Btn
                              tamanho="sm"
                              variante="cinza"
                              icone={u.ativo ? 'ti-ban' : 'ti-check'}
                              onClick={() => handleToggleAtivo(u.id, u.ativo)}
                              disabled={toggling}
                            >
                              {toggling ? '...' : u.ativo ? 'Desativar' : 'Ativar'}
                            </Btn>
                            <Btn
                              tamanho="sm"
                              variante="cinza"
                              icone={editando ? undefined : 'ti-pencil'}
                              onClick={() => editando ? setEditandoId(null) : abrirEdicao(u)}
                            >
                              {editando ? 'Cancelar' : 'Editar'}
                            </Btn>
                            <Btn
                              tamanho="sm"
                              variante="cinza"
                              icone="ti-key"
                              onClick={() => handleRedefinirSenha(u)}
                              disabled={redefinindoId === u.id || isSelf}
                            >
                              {redefinindoId === u.id ? '...' : 'Senha'}
                            </Btn>
                            {!cooperadoSet.has(u.id) && (
                              <Btn
                                tamanho="sm"
                                variante="cinza"
                                icone="ti-user-check"
                                onClick={() => {
                                  setModalCooperadoUsuario(u)
                                  setErroCooperado('')
                                  setOkCooperado('')
                                  setFormCooperado({ numero_matricula: '', data_admissao: '', quota_parte: '', caf_numero: '', dap_numero: '', status: 'ativo' })
                                }}
                              >
                                Tornar Cooperado
                              </Btn>
                            )}
                          </>
                        )}
                        {cooperadoSet.has(u.id) && (
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                            background: '#E6F7F1', color: '#166534', fontWeight: '500',
                            whiteSpace: 'nowrap',
                          }}>
                            ✓ Cooperado
                          </span>
                        )}
                      </div>
                    </div>

                    {editando && (
                      <div style={{ borderTop: '1px solid #f0eeea', background: '#f8f7f4', padding: '16px 16px 16px 68px' }}>
                        {erroEditar && <Alerta tipo="erro" style={{ marginBottom: '12px' }}>{erroEditar}</Alerta>}
                        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'start' }}>
                          <div>
                            <FieldLabel>Vínculo</FieldLabel>
                            <select
                              value={editForm.vinculo}
                              onChange={e => setEditForm(prev => ({ ...prev, vinculo: e.target.value }))}
                              style={{ ...inp, background: '#fff' }}
                            >
                              <option value="">Sem vínculo</option>
                              {VINCULO_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <FieldLabel>Funções</FieldLabel>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {funcoes.map(f => {
                                const sel = editForm.funcoes.includes(f.nome)
                                return (
                                  <button
                                    key={f.nome} type="button"
                                    onClick={() => toggleFuncaoEdit(f.nome)}
                                    style={{
                                      fontSize: '12px', padding: '4px 12px', borderRadius: '12px',
                                      border: `1px solid ${sel ? GREEN : '#d5d3cc'}`,
                                      background: sel ? '#EEF0FF' : '#fff',
                                      color: sel ? GREEN_DARK : '#555',
                                      cursor: 'pointer', fontWeight: sel ? '600' : '400',
                                    }}
                                  >
                                    {f.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => salvarEdicao(u.id)}
                            disabled={salvando}
                            style={{
                              padding: '8px 18px',
                              background: salvando ? '#9F9BFF' : GREEN,
                              color: '#fff', border: 'none', borderRadius: '7px',
                              fontSize: '12px', fontWeight: '600',
                              cursor: salvando ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {salvando ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            style={{
                              padding: '8px 14px', background: '#fff',
                              border: '1px solid #d5d3cc', borderRadius: '7px',
                              fontSize: '12px', color: '#555', cursor: 'pointer',
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Seção de pendentes */}
          {filtradosPendentes.length > 0 && (
            <div style={{ marginTop: filtrados.length > 0 ? '1.5rem' : 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Aguardando aceite ({filtradosPendentes.length})
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
                {filtradosPendentes.map((p, i) => {
                  const iniciais = p.nome_completo.split(' ').map(x => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                  const ativando   = ativandoId === p.id
                  const reenviando = reenviandoId === p.id
                  const revogando  = revogandoId === p.id
                  const ocupado    = ativando || reenviando || revogando

                  return (
                    <div key={p.id}>
                      {i > 0 && <div style={{ borderTop: '1px solid #f0eeea' }} />}
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: '#e5e3dc', color: '#aaa',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '700',
                        }}>
                          {iniciais}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{p.nome_completo}</div>
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{p.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flexShrink: 0 }}>
                          {p.vinculo && (
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#f0eeea', color: '#555', fontWeight: '500' }}>
                              {VINCULO_LABEL[p.vinculo] ?? p.vinculo}
                            </span>
                          )}
                          {p.funcoes.map(f => (
                            <span key={f} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#EEF0FF', color: GREEN_DARK, fontWeight: '600' }}>
                              {FUNCAO_LABEL[f] ?? f}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{
                            fontSize: '11px', padding: '2px 10px', borderRadius: '10px', fontWeight: '500', whiteSpace: 'nowrap',
                            background: '#FFF8E1', color: '#92400e', border: '1px solid #FDE68A',
                          }}>
                            Convite enviado
                          </span>
                          <button
                            onClick={() => { setModalAtivar(p); setSenhaAtivar(''); setErroSenha('') }}
                            disabled={ocupado}
                            style={{
                              padding: '5px 10px', border: 'none',
                              borderRadius: '6px', background: '#E6F7F1',
                              fontSize: '11px', color: '#166534', fontWeight: '600',
                              cursor: ocupado ? 'not-allowed' : 'pointer',
                              opacity: ocupado ? 0.6 : 1, whiteSpace: 'nowrap',
                            }}
                          >
                            Ativar
                          </button>
                          <button
                            onClick={() => handleReenviar(p)}
                            disabled={ocupado}
                            style={{
                              padding: '5px 10px', border: '1px solid #d5d3cc',
                              borderRadius: '6px', background: '#fff',
                              fontSize: '11px', color: '#555',
                              cursor: ocupado ? 'not-allowed' : 'pointer',
                              opacity: ocupado ? 0.6 : 1, whiteSpace: 'nowrap',
                            }}
                          >
                            {reenviando ? '...' : 'Reenviar'}
                          </button>
                          <button
                            onClick={() => handleRevogar(p)}
                            disabled={ocupado}
                            style={{
                              padding: '5px 10px', border: '1px solid #fca5a5',
                              borderRadius: '6px', background: '#fff',
                              fontSize: '11px', color: '#dc2626',
                              cursor: ocupado ? 'not-allowed' : 'pointer',
                              opacity: ocupado ? 0.6 : 1, whiteSpace: 'nowrap',
                            }}
                          >
                            {revogando ? '...' : 'Revogar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
      {children}{required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}
    </div>
  )
}

function Alerta({ tipo, children, style }: { tipo: 'erro' | 'ok'; children: React.ReactNode; style?: React.CSSProperties }) {
  const ok = tipo === 'ok'
  return (
    <div style={{
      background: ok ? '#E6F7F1' : '#fef2f2',
      border: `1px solid ${ok ? '#1D9E7533' : '#fca5a5'}`,
      borderRadius: '8px', padding: '8px 12px',
      fontSize: '13px', color: ok ? '#166534' : '#dc2626',
      ...style,
    }}>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
