import Link from 'next/link'

const GREEN = '#635BFF'
const GREEN_DARK = '#4840CC'
const TEXT = '#1a1a1a'
const BG = '#f8f7f4'
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"

export default function AssinaturaSuccessPage() {
  return (
    <div
      style={{
        fontFamily: FONT,
        color: TEXT,
        background: BG,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e8e6e1',
          borderRadius: 20,
          padding: '56px 48px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#e6f5f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 32,
          }}
        >
          ✅
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: TEXT,
            marginBottom: 12,
          }}
        >
          Assinatura ativada!
        </h1>

        <p style={{ fontSize: 15, color: '#555', lineHeight: 1.65, marginBottom: 36 }}>
          Sua assinatura do NexCoop está ativa. Você já pode usar todos os recursos do seu plano.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '13px 32px',
            borderRadius: 10,
            background: GREEN,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(29,158,117,0.25)',
          }}
        >
          Ir para o dashboard
        </Link>

        <p style={{ fontSize: 12, color: '#aaa', marginTop: 24 }}>
          Você receberá um e-mail de confirmação com os detalhes da assinatura.
        </p>
      </div>
    </div>
  )
}
