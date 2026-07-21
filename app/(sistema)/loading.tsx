/**
 * Fallback do App Router enquanto o RSC da página carrega.
 * Fundo sólido (#D2D8D0) — nunca tela em branco entre rotas.
 */
export default function SistemaLoading() {
  return (
    <div
      style={{
        margin: '0 calc(-1 * var(--nxc-gutter, 1rem))',
        minHeight: 'calc(100vh - 24px)',
        background: '#D2D8D0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      aria-busy="true"
      aria-label="Carregando página"
    >
      <style>{`
        @keyframes nxc-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .nxc-skel {
          background: linear-gradient(90deg, #C5CEC4 0%, #E8EDE7 45%, #C5CEC4 90%);
          background-size: 800px 100%;
          animation: nxc-shimmer 1.15s ease-in-out infinite;
          border-radius: 12px;
        }
      `}</style>

      {/* Header HERO */}
      <div
        style={{
          height: 56,
          background: 'var(--nxc-marca-bg, linear-gradient(180deg, #2E7D32 0%, #1B5E20 100%))',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px 0 56px',
          gap: 12,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.18)', flexShrink: 0,
        }} />
        <div style={{
          height: 14, width: 130, borderRadius: 6,
          background: 'rgba(255,255,255,0.28)',
        }} />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="nxc-skel" style={{ height: 72 }} />
          ))}
        </div>
        <div className="nxc-skel" style={{ height: 150, marginBottom: 12 }} />
        <div className="nxc-skel" style={{ height: 112, marginBottom: 12 }} />
        <div className="nxc-skel" style={{ height: 90, maxWidth: 440 }} />
        <p style={{ marginTop: 18, fontSize: 13, color: '#515E53', textAlign: 'center', fontWeight: 500 }}>
          Carregando…
        </p>
      </div>
    </div>
  )
}
