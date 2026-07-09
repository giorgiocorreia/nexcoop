export function HubStyles() {
  return (
    <style>{`
      @keyframes com-pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.45); }
        50%      { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
      }
      .com-dot-pulse { animation: com-pulse 2s ease-in-out infinite; }
      .com-page-header { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
      .com-hub-content { padding: 28px 32px; margin: 0 -2rem -2rem -2rem; background: #E9F0E7; min-height: 100vh; }
      .com-hub-date { font-size: 12px; color: #5F6C61; padding-left: 50px; }
      .com-kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; margin-bottom: 24px; }
      .com-kpi-card {
        display: flex; align-items: center; gap: 14px;
        border-radius: 12px; border: 1px solid #D5DFD3;
        padding: 14px 16px; min-height: 72px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .com-kpi-card:hover { border-color: #C6D4C4; box-shadow: 0 3px 12px rgba(24,33,26,0.07); }
      .com-kpi-icon {
        width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .com-kpi-icon i { font-size: 20px; color: #fff; }
      .com-kpi-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
      .com-kpi-label { font-size: 11px; font-weight: 600; color: #5F6C61; line-height: 1.3; }
      .com-kpi-value { font-size: clamp(17px, 1.35vw, 22px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .com-kpi-sub { font-size: 10px; color: #96A398; line-height: 1.3; margin-top: 1px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .com-chart-row { display: grid; grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); gap: 16px; margin-bottom: 24px; }
      .com-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
      .com-link-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
      .com-link-card { display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px;
        background: #fff; border: 1px solid #D5DFD3; border-radius: 12px; text-decoration: none;
        transition: border-color 0.15s, box-shadow 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
      .com-link-card:hover { border-color: #2E7D32; box-shadow: 0 4px 12px rgba(27,94,32,0.14); }
      .com-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.08em; color: #5F6C61; margin: 0 0 12px; }
      .com-btn-cta { transition: opacity 0.15s, transform 0.1s; }
      .com-btn-cta:hover { opacity: 0.92; transform: translateY(-1px); }
      .com-guia-card { background: #fff; border: 1px solid #D5DFD3; border-radius: 12px; padding: 16px 18px; }
      .com-venda-row:hover { background: #F7FAF6 !important; }
      .com-list-row:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); border-color: #C6D4C4 !important; }
      .com-kpi-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-bottom: 24px; }
      .com-table th { font-size: 10px; font-weight: 700; color: #5F6C61; text-transform: uppercase; letter-spacing: 0.06em; padding: 12px 16px; text-align: left; border-bottom: 1px solid #D5DFD3; background: #F7FAF6; }
      .com-table td { padding: 12px 16px; border-bottom: 1px solid #EDF2EC; font-size: 13px; color: #18211A; }
      .com-table tr:hover td { background: #F7FAF6; }
      .com-saldo-bar { background: linear-gradient(135deg, #92400e 0%, #78350f 100%); color: #fff; border-radius: 12px; padding: 16px 22px; margin-bottom: 20px; }
      @media (max-width: 1450px) {
        .com-kpi-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
      }
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
        .com-kpi-value { font-size: 18px; }
        .com-kpi-icon { width: 38px; height: 38px; }
        .com-kpi-icon i { font-size: 17px; }
        .com-kpi-card { padding: 12px 14px; min-height: 64px; gap: 10px; }
        .com-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .com-kpi-grid-4 { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .com-link-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  )
}