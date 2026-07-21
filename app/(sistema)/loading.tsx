/**
 * Fallback imediato enquanto a página (RSC) carrega após clique no menu.
 * Layout/sidebar permanecem; só a área de conteúdo troca.
 */
export default function SistemaLoading() {
  return (
    <div
      style={{
        padding: '20px 0 40px',
        minHeight: '50vh',
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
          background: linear-gradient(90deg, #E4E9E3 0%, #F4F6F3 45%, #E4E9E3 90%);
          background-size: 800px 100%;
          animation: nxc-shimmer 1.2s ease-in-out infinite;
          border-radius: 10px;
        }
      `}</style>

      {/* Header fake */}
      <div
        className="nxc-skel"
        style={{
          height: 56,
          margin: '0 calc(-1 * var(--nxc-gutter, 1rem)) 16px',
          borderRadius: 0,
          background: 'linear-gradient(180deg, #2E7D32 0%, #1B5E20 100%)',
          opacity: 0.85,
          animation: 'none',
        }}
      />

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="nxc-skel" style={{ height: 72 }} />
        ))}
      </div>

      {/* Cards */}
      <div className="nxc-skel" style={{ height: 160, marginBottom: 14 }} />
      <div className="nxc-skel" style={{ height: 120, marginBottom: 14 }} />
      <div className="nxc-skel" style={{ height: 100, maxWidth: 480 }} />

      <p style={{ marginTop: 20, fontSize: 13, color: '#515E53', textAlign: 'center' }}>
        Carregando…
      </p>
    </div>
  )
}
