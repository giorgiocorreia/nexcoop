'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CampoSenha } from '@/components/CampoSenha'

const PURPLE = '#635BFF'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)

    if (error) {
      setErro('Erro ao redefinir senha: ' + error.message)
      return
    }

    setSucesso(true)
    setTimeout(() => router.replace('/login'), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f7f4',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <img
          src="/images/logo-nexcoop-horizontal.png"
          alt="NexCoop"
          style={{ height: 40, width: 'auto', display: 'block', margin: '0 auto 2rem' }}
        />

        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '16px', padding: '2rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 1.5rem' }}>
            Redefinir senha
          </h1>

          {sucesso ? (
            <div style={{
              background: '#f0faf6', border: '1px solid #6ee7b7',
              borderRadius: '8px', padding: '16px',
              fontSize: '14px', color: '#065f46', textAlign: 'center',
            }}>
              ✅ Senha redefinida com sucesso! Redirecionando…
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                  Nova senha
                </label>
                <CampoSenha value={senha} onChange={setSenha} placeholder="Mínimo 8 caracteres" />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                  Confirmar nova senha
                </label>
                <CampoSenha value={confirmar} onChange={setConfirmar} placeholder="Repita a nova senha" />
              </div>

              {erro && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: '8px', padding: '10px 12px',
                  fontSize: '13px', color: '#dc2626', marginBottom: '1rem',
                }}>
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={salvando}
                style={{
                  width: '100%', padding: '11px',
                  background: salvando ? '#9F9BFF' : PURPLE,
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: '600',
                  cursor: salvando ? 'not-allowed' : 'pointer',
                }}
              >
                {salvando ? 'Salvando…' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '1.5rem' }}>
          NexCoop © 2026 — Gestão que fortalece quem produz juntos
        </p>
      </div>
    </div>
  )
}
