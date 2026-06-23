import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { temModulo } from "@/lib/org";
import { podeVerEstoqueLoja, podeVenderLoja } from "@/lib/permissoes";
import GraficoFaturamento from "@/components/loja/GraficoFaturamento";
import {
  getHubKpis,
  getAlertasEstoque,
  getTopProdutos,
  getUltimasVendas,
  getFaturamentoDiario,
} from "@/lib/loja/hub-actions";

export const metadata = { title: "Loja — NexCoop" };

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtForma(forma: string) {
  const map: Record<string, string> = {
    especie:           "Dinheiro",
    pix:               "PIX",
    cartao:            "Cartão",
    credito_cooperado: "Crédito Coop.",
  };
  return map[forma] ?? forma;
}

export default async function LojaHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("organizacao_id, nome_completo, role, funcoes, organizacoes(modulos_ativos)")
    .eq("id", user.id)
    .single();

  if (!usuario) redirect("/login");

  const orgRaw = usuario.organizacoes as any;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
  if (!temModulo(org?.modulos_ativos, "loja")) redirect("/dashboard");

  const up = { role: usuario.role ?? "", funcoes: (usuario.funcoes ?? []) as string[] };
  if (!podeVerEstoqueLoja(up) && !podeVenderLoja(up)) redirect("/dashboard");

  const orgId = usuario.organizacao_id as string;

  const [kpis, alertas, topProdutos, ultimasVendas, faturamentoDiario] = await Promise.all([
    getHubKpis(orgId),
    getAlertasEstoque(orgId),
    getTopProdutos(orgId),
    getUltimasVendas(orgId),
    getFaturamentoDiario(orgId),
  ]);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const kpiCards = [
    { label: "Faturamento hoje",   value: fmt(kpis.fatHoje),       sub: `${kpis.transacoesHoje} transações hoje`, icon: "💰" },
    { label: "Faturamento do mês", value: fmt(kpis.fatMes),        sub: "Mês corrente",                           icon: "📈" },
    { label: "Ticket médio",       value: fmt(kpis.ticketMedio),   sub: "Mês corrente",                           icon: "🧾" },
    { label: "Saldo em caixa",     value: fmt(kpis.saldoCaixa),    sub: "Estimado (dinheiro + pix)",              icon: "💵", success: true  },
    { label: "Estoque crítico",    value: `${alertas.length} ${alertas.length === 1 ? "item" : "itens"}`, sub: "Abaixo do mínimo", icon: "⚠️", alert: alertas.length > 0 },
    { label: "Vendas em conta",    value: fmt(kpis.vendasEmConta), sub: "Acumulado no mês",                       icon: "🤝" },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200 }}>

      {/* Breadcrumb + status caixa */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>NexCoop</Link>
          <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
          <span style={{ fontSize: 13, color: "#E07B30", fontWeight: 600 }}>Loja Agropecuária</span>
          <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
          <span style={{ fontSize: 13, color: "#78716c", textTransform: "capitalize" }}>{hoje}</span>
        </div>
        {kpis.caixaAberto && (
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 7, padding: "6px 12px",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#16A34A", display: "inline-block",
              boxShadow: "0 0 0 3px rgba(22,163,74,0.2)",
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>
              {(kpis as any).totalCaixasAbertos > 1
                ? `${(kpis as any).totalCaixasAbertos} caixas abertos · ${kpis.operadorNome}`
                : `Caixa aberto · ${kpis.operadorNome ?? "—"}`}
            </span>
          </div>
        )}
      </div>

      {/* Gráfico + Alertas */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 300px",
        gap: 20, marginBottom: 24, alignItems: "start",
      }}>
        <div style={{ background: "#fff", border: "1px solid #e5e3dc", borderRadius: 12, padding: "20px 20px 12px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Faturamento diário</div>
          <div style={{ fontSize: 12, color: "#78716c", marginBottom: 16 }}>Últimos 30 dias</div>
          <GraficoFaturamento dados={faturamentoDiario} />
        </div>

        {alertas.length > 0 ? (
          <div style={{
            background: "#fff8f1", border: "1px solid #fed7aa",
            borderLeft: "4px solid #DC2626", borderRadius: 12, padding: "18px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#9a3412" }}>Estoque crítico</div>
                <div style={{ fontSize: 11, color: "#c2410c" }}>
                  {alertas.length} produto{alertas.length > 1 ? "s" : ""} abaixo do mínimo
                </div>
              </div>
            </div>
            {alertas.map((a, i) => (
              <div key={a.produto_id} style={{
                padding: "10px 0",
                borderTop: i === 0 ? "none" : "1px solid #fed7aa",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{a.nome}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  <span style={{ color: "#DC2626", fontWeight: 700 }}>
                    Atual: {Number(a.estoque_atual).toFixed(2)} {a.unidade}
                  </span>
                  <span style={{ color: "#78716c" }}>
                    Mín: {Number(a.estoque_minimo).toFixed(2)} {a.unidade}
                  </span>
                </div>
              </div>
            ))}
            <Link href="/loja/produtos" style={{
              display: "block", marginTop: 14, padding: "8px",
              background: "#DC2626", color: "#fff",
              borderRadius: 7, fontSize: 12, fontWeight: 700,
              textAlign: "center", textDecoration: "none",
            }}>Ver todos os produtos →</Link>
          </div>
        ) : (
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderLeft: "4px solid #16A34A", borderRadius: 12, padding: "18px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>Estoque ok</div>
              <div style={{ fontSize: 12, color: "#166534" }}>Nenhum produto abaixo do mínimo</div>
            </div>
          </div>
        )}
      </div>

      {/* Top Produtos + Últimas Vendas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        <div style={{ background: "#fff", border: "1px solid #e5e3dc", borderRadius: 12, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716c" }}>
              Top 5 produtos do mês
            </span>
            <Link href="/loja/estoque" style={{ fontSize: 12, color: "#E07B30", fontWeight: 600, textDecoration: "none" }}>
              Ver estoque →
            </Link>
          </div>
          {topProdutos.length === 0 ? (
            <div style={{ fontSize: 13, color: "#78716c", textAlign: "center", padding: "24px 0" }}>
              Nenhuma venda registrada neste mês.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topProdutos.map((p, i) => {
                const pct = topProdutos[0].total > 0 ? (p.total / topProdutos[0].total) * 100 : 0;
                return (
                  <div key={p.produto_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "baseline" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#78716c", width: 16 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.nome}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(p.total)}</div>
                        <div style={{ fontSize: 10, color: "#78716c" }}>{Number(p.qtd).toFixed(0)} un</div>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "#f5f5f4", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: i === 0 ? "#E07B30" : `rgba(224,123,48,${0.7 - i * 0.1})`,
                        borderRadius: 99,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e3dc", borderRadius: 12, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716c" }}>
              Últimas vendas hoje
            </span>
            <Link href="/loja/compras" style={{ fontSize: 12, color: "#E07B30", fontWeight: 600, textDecoration: "none" }}>
              Ver compras →
            </Link>
          </div>
          {ultimasVendas.length === 0 ? (
            <div style={{ fontSize: 13, color: "#78716c", textAlign: "center", padding: "24px 0" }}>
              Nenhuma venda registrada hoje.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Hora", "Nº", "Operador", "Forma", "Total"].map(h => (
                    <th key={h} style={{
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.05em", color: "#78716c",
                      textAlign: h === "Total" ? "right" : "left",
                      padding: "0 6px 8px", borderBottom: "1px solid #e5e3dc",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ultimasVendas.map((v, i) => (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? "transparent" : "#fafaf9" }}>
                    <td style={{ padding: "9px 6px", fontSize: 12, color: "#78716c", fontFamily: "monospace" }}>{v.hora}</td>
                    <td style={{ padding: "9px 6px", fontSize: 12, fontWeight: 600, color: "#E07B30" }}>{v.num}</td>
                    <td style={{ padding: "9px 6px", fontSize: 12 }}>{v.operador}</td>
                    <td style={{ padding: "9px 6px", fontSize: 11 }}>
                      <span style={{
                        background: v.forma === "credito_cooperado" ? "#e0f2fe" : "#f5f5f4",
                        color: v.forma === "credito_cooperado" ? "#0369a1" : "#78716c",
                        padding: "2px 7px", borderRadius: 5, fontWeight: 600, whiteSpace: "nowrap",
                      }}>{fmtForma(v.forma)}</span>
                    </td>
                    <td style={{ padding: "9px 6px", fontSize: 13, fontWeight: 700, textAlign: "right" }}>
                      {fmt(v.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* KPIs — ao final */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
      }}>
        {kpiCards.map((card) => {
          const color = card.alert ? "#DC2626" : card.success ? "#16A34A" : "#E07B30";
          const iconBg = card.alert ? "#fef2f2" : card.success ? "#f0fdf4" : "#fff7ed";
          return (
            <div key={card.label} style={{
              background: "#fff", borderRadius: 10, padding: "16px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <div style={{
                  fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1,
                  color: card.alert ? "#DC2626" : "#1c1917", whiteSpace: "nowrap",
                }}>{card.value}</div>
                <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>{card.label}</div>
                {card.sub && (
                  <div style={{ fontSize: 11, color: card.alert ? "#DC2626" : "#78716c" }}>{card.sub}</div>
                )}
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0, color,
              }}>{card.icon}</div>
            </div>
          );
        })}
      </div>

      {/* FAB flutuante */}

    </div>
  );
}
