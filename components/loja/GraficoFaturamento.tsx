"use client";

interface Ponto { label: string; valor: number }

interface Props { dados: Ponto[] }

export default function GraficoFaturamento({ dados }: Props) {
  if (!dados.length) return null;

  const W = 780, H = 180;
  const PAD = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...dados.map(d => d.valor), 1);
  const pts = dados.map((d, i) => ({
    x: PAD.left + (i / Math.max(dados.length - 1, 1)) * innerW,
    y: PAD.top + innerH - (d.valor / maxVal) * innerH,
    ...d,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const areaPath = [
    `M ${pts[0].x} ${PAD.top + innerH}`,
    ...pts.map(p => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${PAD.top + innerH}`,
    "Z",
  ].join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PAD.top + innerH - t * innerH,
    val: Math.round((t * maxVal) / 100) * 100,
  }));

  const xLabels = pts.filter((_, i) => i % 5 === 0);
  const fmt = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`;
  const ultimo = pts[pts.length - 1];

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 320, height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E07B30" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#E07B30" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={PAD.left + innerW} y2={t.y}
              stroke="#e5e3dc" strokeWidth="1" strokeDasharray={i === 0 ? "none" : "4,4"} />
            <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill="#a8a29e">
              {fmt(t.val)}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <polyline points={polyline} fill="none" stroke="#E07B30" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
        {xLabels.map((p, i) => (
          <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill="#a8a29e">
            {p.label}
          </text>
        ))}
        <circle cx={ultimo.x} cy={ultimo.y} r="4" fill="#E07B30" stroke="#fff" strokeWidth="2" />
        <text x={ultimo.x} y={ultimo.y - 10} textAnchor="middle" fontSize="10"
          fill="#E07B30" fontWeight="600">hoje</text>
      </svg>
    </div>
  );
}
