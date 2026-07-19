'use client'

import React, { useRef, useState } from 'react'
import type { Usuario } from '@/types/database'
import { traduzirErro } from '@/lib/utils/erros'
import { uploadFile } from '@/lib/supabase/storage'
import { alterarEmail, salvarAvatarUrl, salvarPerfilUsuario } from './actions'

const GREEN = '#635BFF'

const VINCULO_LABEL: Record<string, string> = {
  cooperado:   'Cooperado',
  funcionario: 'Funcionário',
  diretoria:   'Diretoria',
  externo:     'Externo',
}

const FUNCAO_LABEL: Record<string, string> = {
  admin:          'Administrador',
  financeiro:     'Financeiro',
  tecnico:        'Técnico',
  comercial:      'Comercial',
  conselho_fiscal:'Conselho Fiscal',
  captador:       'Captador',
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

interface Props { usuario: Usuario }

export default function PerfilUsuario({ usuario: u }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Dados básicos ──────────────────────────────────────────────────────────
  const [nome,     setNome]     = useState(u.nome_completo)
  const [telefone, setTelefone] = useState(u.telefone ?? '')
  const [avatar,   setAvatar]   = useState(u.avatar_url ?? '')

  const [salvando, setSalvando]   = useState(false)
  const [erroDados, setErroDados] = useState('')
  const [okDados,   setOkDados]   = useState('')

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const [upAvatar, setUpAvatar]   = useState(false)
  const [erroAv,   setErroAv]     = useState('')

  // ── E-mail ─────────────────────────────────────────────────────────────────
  const [emailExibido, setEmailExibido] = useState(u.email)
  const [showEmail,    setShowEmail]    = useState(false)
  const [novoEmail,    setNovoEmail]    = useState('')
  const [senhaConf,    setSenhaConf]    = useState('')
  const [salvEmail,    setSalvEmail]    = useState(false)
  const [erroEmail,    setErroEmail]    = useState('')
  const [okEmail,      setOkEmail]      = useState('')

  async function salvarDados() {
    if (!nome.trim()) { setErroDados('Nome completo é obrigatório.'); return }
    setSalvando(true); setErroDados(''); setOkDados('')
    const res = await salvarPerfilUsuario({ nome_completo: nome, telefone: telefone || null })
    setSalvando(false)
    if (res.error) { setErroDados(res.error); return }
    setOkDados('Dados atualizados.')
    setTimeout(() => setOkDados(''), 3000)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUpAvatar(true); setErroAv('')
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${u.id}/avatar.${ext}`
    const res  = await uploadFile('avatares', path, file)
    if (res.error) { setErroAv(traduzirErro(res.error)); setUpAvatar(false); return }
    const dbRes = await salvarAvatarUrl(res.url ?? '')
    setUpAvatar(false)
    if (dbRes.error) { setErroAv(dbRes.error); return }
    setAvatar(res.url ?? '')
  }

  async function salvarEmail() {
    if (!novoEmail.trim()) { setErroEmail('Informe o novo e-mail.'); return }
    if (!senhaConf)         { setErroEmail('Confirme sua senha atual.'); return }
    setSalvEmail(true); setErroEmail(''); setOkEmail('')

    const res = await alterarEmail(novoEmail.trim(), senhaConf)
    setSalvEmail(false)
    if (res.error) { setErroEmail(traduzirErro(res.error)); return }

    const emailNovo = novoEmail.trim()
    setEmailExibido(emailNovo)
    setOkEmail(`E-mail alterado para ${emailNovo}.`)
    setNovoEmail(''); setSenhaConf(''); setShowEmail(false)
  }

  const iniciais = nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1.25rem' }}>Meu perfil</div>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {avatar
            ? <img src={avatar} alt="Avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e3dc' }} />
            : <div style={{ width: 72, height: 72, borderRadius: '50%', background: GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', border: '2px solid #e5e3dc' }}>{iniciais}</div>
          }
          {upAvatar && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '18px' }}>⏳</span>
            </div>
          )}
        </div>
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={upAvatar}
            style={{ fontSize: '12px', fontWeight: '600', padding: '6px 14px', border: '1px solid #d5d3cc', borderRadius: '7px', background: '#fff', color: '#555', cursor: 'pointer' }}>
            {upAvatar ? 'Enviando…' : 'Alterar foto'}
          </button>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>JPG, PNG ou WebP · máx. 2 MB</div>
          {erroAv && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>{erroAv}</div>}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
      </div>

      {/* Nome + Telefone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
        <div>
          <FieldLabel required>Nome completo</FieldLabel>
          <input value={nome} onChange={e => setNome(e.target.value)} style={inp}
            onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = '#d5d3cc'} />
        </div>
        <div>
          <FieldLabel>Telefone</FieldLabel>
          <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" style={inp}
            onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = '#d5d3cc'} />
        </div>
      </div>

      {erroDados && <Alerta tipo="erro">{erroDados}</Alerta>}
      {okDados   && <Alerta tipo="ok">{okDados}</Alerta>}

      <button type="button" onClick={salvarDados} disabled={salvando}
        style={{ ...btnPrimary, opacity: salvando ? 0.7 : 1, marginBottom: '1.5rem' }}>
        {salvando ? 'Salvando…' : 'Salvar dados'}
      </button>

      <div style={{ borderTop: '1px solid #f0eeea', marginBottom: '1.25rem' }} />

      {/* E-mail */}
      <div style={{ marginBottom: '1.25rem' }}>
        <FieldLabel>E-mail</FieldLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...inp, color: '#888', background: '#f0eeea', flex: 1, cursor: 'default' }}>{emailExibido}</div>
          <button type="button"
            onClick={() => { setShowEmail(v => !v); setErroEmail(''); setOkEmail('') }}
            style={{ fontSize: '12px', fontWeight: '600', padding: '9px 14px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', color: '#555', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {showEmail ? 'Cancelar' : 'Alterar e-mail'}
          </button>
        </div>

        {okEmail && <Alerta tipo="ok" style={{ marginTop: '8px' }}>{okEmail}</Alerta>}

        {showEmail && (
          <div style={{ marginTop: '12px', background: '#f8f7f4', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <FieldLabel>Novo e-mail</FieldLabel>
              <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} placeholder="novo@email.com" style={inp}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = '#d5d3cc'} />
            </div>
            <div>
              <FieldLabel>Senha atual (para confirmar)</FieldLabel>
              <input type="password" value={senhaConf} onChange={e => setSenhaConf(e.target.value)} placeholder="••••••••" style={inp}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = '#d5d3cc'} />
            </div>
            {erroEmail && <Alerta tipo="erro">{erroEmail}</Alerta>}
            <button type="button" onClick={salvarEmail} disabled={salvEmail}
              style={{ ...btnPrimary, alignSelf: 'flex-start', opacity: salvEmail ? 0.7 : 1 }}>
              {salvEmail ? 'Verificando…' : 'Confirmar troca de e-mail'}
            </button>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #f0eeea', marginBottom: '1.25rem' }} />

      {/* Dados somente leitura */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        <ReadField label="Vínculo">
          {u.vinculo ? (VINCULO_LABEL[u.vinculo] ?? u.vinculo) : '—'}
        </ReadField>
        <ReadField label="Funções">
          {(u.funcoes ?? []).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
              {u.funcoes.map(f => (
                <span key={f} style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: '#EEF0FF', color: '#4840CC' }}>
                  {FUNCAO_LABEL[f] ?? f}
                </span>
              ))}
            </div>
          ) : <span style={{ color: '#aaa' }}>—</span>}
        </ReadField>
        <ReadField label="Membro desde">
          {formatData(u.criado_em)}
        </ReadField>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
      {children}{required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}
    </div>
  )
}

function ReadField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{children}</div>
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
      marginBottom: '8px', ...style,
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

const btnPrimary: React.CSSProperties = {
  padding: '10px 24px', background: '#1D9E75', color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '14px',
  fontWeight: '600', cursor: 'pointer',
}
