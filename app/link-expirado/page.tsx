export default function LinkExpiradoPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 40, maxWidth: 420, textAlign: 'center' }}>
        <img src="/images/logo-nexcoop-horizontal.png" alt="NexCoop" style={{ height: 36, width: 'auto', display: 'block', margin: '0 auto 1.5rem' }} />
        <p style={{ fontSize: 32, marginBottom: 16 }}>⏱</p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Link expirado</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
          Este link de convite já foi utilizado ou expirou.
          Peça ao administrador para reenviar o convite.
        </p>
        <a href='/login' style={{ display: 'inline-block', padding: '10px 24px', background: '#635BFF', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          Ir para o login
        </a>
      </div>
    </div>
  )
}
