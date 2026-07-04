export function HubStyles() {
  return (
    <style>{`
      @keyframes com-pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.45); }
        50%      { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
      }
      .com-dot-pulse { animation: com-pulse 2s ease-in-out infinite; }
      .com-page-header { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
      .com-hub-content { padding: 28px 32px; margin: 0 -2rem -2rem -2rem; background: #FBF8F4; min-height: 100vh; }
      .com-hub-date { font-size: 12px; color: #78716C; padding-left: 50px; }
      .com-kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 12px; margin-bottom: 24px; }
      .com-kpi-card { background: #fff; border-radius: 14px; border: 1px solid #E5E3DC; padding: 18px 18px 16px;
        position: relative; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        transition: transform 0.15s, box-shadow 0.15s; }
      .com-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
      .com-kpi-value { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; margin-bottom: 5px; }
      .com-chart-row { display: grid; grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); gap: 16px; margin-bottom: 24px; }
      .com-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
      .com-link-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
      .com-link-card { display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px;
        background: #fff; border: 1px solid #E5E3DC; border-radius: 12px; text-decoration: none;
        transition: border-color 0.15s, box-shadow 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
      .com-link-card:hover { border-color: #92400e; box-shadow: 0 4px 12px rgba(146,64,14,0.12); }
      .com-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.08em; color: #78716C; margin: 0 0 12px; }
      .com-btn-cta { transition: opacity 0.15s, transform 0.1s; }
      .com-btn-cta:hover { opacity: 0.92; transform: translateY(-1px); }
      .com-guia-card { background: #fff; border: 1px solid #E5E3DC; border-radius: 12px; padding: 16px 18px; }
      .com-venda-row:hover { background: #FAFAF9 !important; }
      @media (max-width: 1200px) {
        .com-kpi-grid { grid-template-columns: repeat(3, 1fr); }
        .com-link-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 1024px) {
        .com-chart-row { grid-template-columns: 1fr; }
        .com-two-col { grid-template-columns: 1fr; }
      }
      @media (max-width: 640px) {
        .com-page-header { padding: 0 16px 0 56px; min-height: 60px; flex-wrap: wrap; }
        .com-hub-content { padding: 16px; }
        .com-hub-date { display: none; }
        .com-kpi-value { font-size: 20px; }
        .com-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .com-link-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  )
}