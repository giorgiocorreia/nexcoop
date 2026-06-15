'use client'

import { useState } from 'react'
import { validarSenhaAutorizador } from '@/lib/loja/actions'
import { Btn } from '@/components/ui/Btn'

interface Props {
  orgId: string
  titulo: string
  descricao: string
  onAutorizado: (autorizadorId: string, nome: string) => void
  onCancelar: () => void
}

export default function ModalAutorizacao({ orgId, titulo, descricao, onAutorizado, onCancelar }: Props) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleAutorizar() {
    if (!senha.trim()) { setErro('Digite a senha do autorizador.'); return }
    setCarregando(true); setErro('')
    const res = await validarSenhaAutorizador(orgId, senha)
    setCarregando(false)
    if (res.valido && res.autorizador_id) {
      onAutorizado(res.autorizador_id, res.nome ?? '')
    } else {
      setErro('Senha invalida ou usuario sem permissao.')
      setSenha('')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#1a1a2e' }}>Autorizacao necessaria</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{descricao}</div>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          Senha do gerente / admin
        </label>
        <input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAutorizar()}
          autoFocus
          style={{
            width: '100%', padding: '8px 12px', border: `1.5px solid ${erro ? '#ef4444' : '#d1d5db'}`,
            borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />
        {erro && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <Btn variante="cinza" onClick={onCancelar} disabled={carregando}>Cancelar</Btn>
          <Btn
            onClick={handleAutorizar}
            disabled={carregando || !senha}
            style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}
          >
            {carregando ? 'Verificando...' : 'Autorizar'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
