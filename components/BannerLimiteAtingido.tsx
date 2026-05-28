'use client'

import { useRouter } from 'next/navigation'
import { getProximoPlano, PLANOS } from '@/lib/planos'

interface Props {
  planoAtual: string
  totalAtual: number
  limite: number
}

export default function BannerLimiteAtingido({ planoAtual, totalAtual, limite }: Props) {
  const router = useRouter()
  const proximo = getProximoPlano(planoAtual)
  const planoNome = PLANOS[planoAtual as keyof typeof PLANOS]?.nome ?? planoAtual

  return (
    <div style={{
      background: '#fef9ec',
      border: '1px solid #f5c842',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '24px', flexShrink: 0 }}>🔒</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#92400e', margin: '0 0 6px' }}>
            Limite de filiados atingido
          </p>
          <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 1rem', lineHeight: '1.5' }}>
            Seu plano <strong>{planoNome}</strong> permite até <strong>{limite} filiados</strong>.
            Você já tem <strong>{totalAtual}</strong> cadastrados.
            Faça upgrade para continuar crescendo.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {proximo && (
              <button
                onClick={() => router.push('/assinar')}
                style={{
                  padding: '8px 18px',
                  background: '#1D9E75',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Fazer upgrade → {proximo.nome}
                {proximo.preco_mensal ? ` (R$${proximo.preco_mensal}/mês)` : ''}
              </button>
            )}
            <button
              onClick={() => router.push('/cooperados')}
              style={{
                padding: '8px 16px',
                background: 'none',
                color: '#78350f',
                border: '1px solid #f5c842',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}