'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GREEN = '#1D9E75'
const GREEN_DARK = '#0F6E56'
const TEXT = '#1a1a1a'
const BG = '#f8f7f4'
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"

interface Plano {
  key: string
  nome: string
  preco: string
  periodo: string
  limite: string
  features: string[]
  destaque: boolean
  priceId: string | null
  gratuito: boolean
}

interface Props {
  planos: Plano[]
  orgId: string | null
}

export default function AssinarPlanos({ planos, orgId }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  async function handleAssinar(plano: Plano) {
    if (plano.gratuito) {
      router.push('/dashboard')
      return
    }

    if (!plano.priceId) return
    if (!orgId) {
      setErro('Sua conta ainda não está associada a uma organização. Contate o suporte.')
      return
    }

    setLoading(plano.key)
    setErro(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: plano.priceId, organizacao_id: orgId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || 'Erro ao iniciar checkout')
        return
      }

      router.push(data.url)
    } catch {
      setErro('Falha na conexão. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {erro && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          borderRadius: 8,
          padding: '12px 16px',
          fontSize: 14,
          marginBottom: 32,
        }}>
          {erro}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
      }}>
        {planos.map((plano) => (
          <PlanoCard
            key={plano.key}
            plano={plano}
            carregando={loading === plano.key}
            onAssinar={() => handleAssinar(plano)}
          />
        ))}
      </div>
    </div>
  )
}

function PlanoCard({
  plano,
  carregando,
  onAssinar,
}: {
  plano: Plano
  carregando: boolean
  onAssinar: () => void
}) {
  const enterprise = plano.key === 'enterprise'
  const gratuito = plano.gratuito

  return (
    <div style={{
      border: plano.destaque ? `2px solid ${GREEN}` : '1px solid #e8e6e1',
      borderRadius: 16,
      padding: '32px 24px',
      background: plano.destaque ? '#f0faf6' : BG,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {plano.destaque && (
        <span style={{
          position: 'absolute',
          top: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: GREEN,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 12px',
          borderRadius: 20,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Mais popular
        </span>
      )}

      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: TEXT }}>{plano.nome}</div>

      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: TEXT }}>{plano.preco}</span>
        <span style={{ fontSize: 14, color: '#888', fontWeight: 500 }}>{plano.periodo}</span>
      </div>

      <div style={{ fontSize: 13, color: GREEN_DARK, fontWeight: 600, marginBottom: 20 }}>
        {plano.limite}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
        {plano.features.map((f) => (
          <li key={f} style={{
            fontSize: 13,
            color: '#555',
            padding: '5px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ color: GREEN, fontWeight: 700 }}>✓</span> {f}
          </li>
        ))}
      </ul>

      {enterprise ? (
        <a
          href="mailto:contato@nextcoop.com.br"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '11px 0',
            borderRadius: 8,
            background: 'transparent',
            border: `1.5px solid ${GREEN}`,
            color: GREEN,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Falar com vendas
        </a>
      ) : gratuito ? (
        <button
          onClick={onAssinar}
          style={{
            display: 'block',
            width: '100%',
            padding: '11px 0',
            borderRadius: 8,
            background: 'transparent',
            border: '1.5px solid #ccc',
            color: '#666',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Começar grátis
        </button>
      ) : (
        <button
          onClick={onAssinar}
          disabled={carregando}
          style={{
            display: 'block',
            width: '100%',
            padding: '11px 0',
            borderRadius: 8,
            background: plano.destaque ? GREEN : 'transparent',
            border: plano.destaque ? 'none' : `1.5px solid ${GREEN}`,
            color: plano.destaque ? '#fff' : GREEN,
            fontWeight: 600,
            fontSize: 14,
            cursor: carregando ? 'not-allowed' : 'pointer',
            opacity: carregando ? 0.7 : 1,
          }}
        >
          {carregando ? 'Aguarde...' : 'Assinar — 14 dias grátis'}
        </button>
      )}
    </div>
  )
}