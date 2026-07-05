import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal do Filiado — NexCoop',
  description: 'Acesso do cooperado ao saldo e informacoes da conta.',
}

export default function FiliadoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F5F3FF 0%, #FAFAF9 40%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #E7E5E4',
        background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/images/logo-nexcoop-onlyone.png" alt="NexCoop" width={32} height={32} style={{ borderRadius: 8 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1C1917', letterSpacing: '-0.02em' }}>Portal do Filiado</div>
            <div style={{ fontSize: 11, color: '#78716C' }}>Acesso do cooperado</div>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 480, margin: '0 auto', padding: '20px 16px 32px' }}>
        {children}
      </main>
    </div>
  )
}