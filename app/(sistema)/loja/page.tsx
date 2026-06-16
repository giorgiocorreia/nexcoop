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
} from "@/lib/loja/hub-actions";

export const metadata = { title: "Loja — NexCoop" };

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtLabel(forma: string) {
  const map: Record<string, string> = {
    dinheiro:  "Dinheiro",
    pix:       "PIX",
    cartao:    "Cartão",
    pago_saldo: "Conta Coop.",
  };
  return map[forma] ?? forma;
}

async function getFaturamentoDiario(orgId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 29);
  inicio.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("loja_vendas")
    .select("total, criado_em")
    .eq("org_id", orgId)
    .eq("status", "concluida")
    .gte("criado_em", inicio.toISOString());

  const mapa: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    mapa[key] = 0;
  }
  for (const v of data ?? []) {
    const key = new Date(v.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    if (key in mapa) mapa[key] += Number(v.total);
  }

  return Object.entries(mapa).map(([label, valor]) => ({ label, valor }));
}

// ── page ─────────────────────────────────────────────────────────────────────

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
    getFaturamentoDiario(orgId, supabase),
  ]);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const accentColor = (alert?: boolean, success?: boolean) =>
    alert ? "#DC2626" : success ? "#16A34A" : "#E07B30";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200 }}>

      {/* Breadcrumb + status do caixa */}
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
              Caixa aberto · {usuario.nome_completo}
            </span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14, marginBottom: 24,
      }}>
        {[
          {
            label: "Faturamento hoje",
            value: fmt(kpis.fatHoje),
            sub: `${kpis.transacoesHoje} transações hoje`,
          },
          {
            label: "Faturamento do mês",
            value: fmt(kpis.fatMes),
            sub: "Mês corrente",
          },
          {
            label: "Ticket médio",
            value: fmt(kpis.ticketMedio),
            sub: "Mês corrente",
          },
          {
            label: "Saldo em caixa",
            value: fmt(kpis.saldoCaixa),
            sub: "Estimado (fundo + entradas)",
            success: true,
          },
          {
            label: "Estoque crítico",
            value: `${alertas.length} ${alertas.length === 1 ? "item" : "itens"}`,
            sub: "Abaixo do mínimo",
            alert: alertas.length > 0,
          },
          {
            label: "Vendas em conta",
            value: fmt(kpis.totalContaMes),
            sub: "Conta corrente no mês",
          },
        ].map((card) => (
          <div key={card.label} style={{
            background: "#fff", border: "1px solid #e5e3dc",
            borderRadius: 12, padding: "18px 20px",
            borderLeft: `4px solid ${accentColor(card.alert, card.success)}`,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.07em", color: "#78716c",
            }}>{card.label}</div>
            <div style={{
              fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1,
              color: card.alert ? "#DC2626" : "#1c1917",
            }}>{card.value}</div>
            {card.sub && <div style={{ fontSize: 12, color: "#78716c" }}>{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Gráfico + Alertas */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 300px",
        gap: 20, marginBottom: 24, alignItems: "start",
      }}>
        <div style={{
          background: "#fff", border: "1px solid #e5e3dc",
          borderRadius: 12, padding: "20px 20px 12px",
        }}>
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
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
                  {a.nome}
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  <span style={{ color: "#DC2626", fontWeight: 700 }}>
                    Atual: {Number(a.estoque_atual).toFixed(a.unidade === "unidade" ? 0 : 2)} {a.unidade}
                  </span>
                  <span style={{ color: "#78716c" }}>
                    Mín: {Number(a.estoque_minimo).toFixed(a.unidade === "unidade" ? 0 : 2)} {a.unidade}
                  </span>
                </div>
              </div>
            ))}
            <Link href="/loja/estoque" style={{
              display: "block", marginTop: 14, padding: "8px",
              background: "#DC2626", color: "#fff",
              borderRadius: 7, fontSize: 12, fontWeight: 700,
              textAlign: "center", textDecoration: "none",
            }}>Ver estoque →</Link>
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
              <div style={{ fontSize: 12, color: "#166534" }}>
                Nenhum produto abaixo do mínimo
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Produtos + Últimas Vendas */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 20, marginBottom: 24,
      }}>
        {/* Top 5 */}
        <div style={{
          background: "#fff", border: "1px solid #e5e3dc",
          borderRadius: 12, padding: "20px",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716c",
            }}>Top 5 produtos do mês</span>
            <Link href="/loja/estoque" style={{
              fontSize: 12, color: "#E07B30", fontWeight: 600, textDecoration: "none",
            }}>Ver estoque →</Link>
          </div>

          {topProdutos.length === 0 ? (
            <div style={{ fontSize: 13, color: "#78716c", textAlign: "center", padding: "24px 0" }}>
              Nenhuma venda registrada neste mês.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topProdutos.map((p, i) => {
                const pct = topProdutos[0].total > 0
                  ? (p.total / topProdutos[0].total) * 100
                  : 0;
                return (
                  <div key={p.produto_id}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      marginBottom: 5, alignItems: "baseline",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#78716c", width: 16 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.nome}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(p.total)}</div>
                        <div style={{ fontSize: 10, color: "#78716c" }}>
                          {Number(p.qtd).toFixed(0)} un
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "#f5f5f4", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
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

        {/* Últimas vendas */}
        <div style={{
          background: "#fff", border: "1px solid #e5e3dc",
          borderRadius: 12, padding: "20px",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716c",
            }}>Últimas vendas hoje</span>
            <Link href="/loja/compras" style={{
              fontSize: 12, color: "#E07B30", fontWeight: 600, textDecoration: "none",
            }}>Ver compras →</Link>
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
                      fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      color: "#78716c",
                      textAlign: h === "Total" ? "right" : "left",
                      padding: "0 6px 8px",
                      borderBottom: "1px solid #e5e3dc",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ultimasVendas.map((v, i) => (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? "transparent" : "#fafaf9" }}>
                    <td style={{ padding: "9px 6px", fontSize: 12, color: "#78716c", fontFamily: "monospace" }}>
                      {v.hora}
                    </td>
                    <td style={{ padding: "9px 6px", fontSize: 12, fontWeight: 600, color: "#E07B30" }}>
                      {v.num}
                    </td>
                    <td style={{ padding: "9px 6px", fontSize: 12 }}>{v.operador}</td>
                    <td style={{ padding: "9px 6px", fontSize: 11 }}>
                      <span style={{
                        background: v.forma === "pago_saldo" ? "#e0f2fe" : "#f5f5f4",
                        color: v.forma === "pago_saldo" ? "#0369a1" : "#78716c",
                        padding: "2px 7px", borderRadius: 5, fontWeight: 600, whiteSpace: "nowrap",
                      }}>{fmtLabel(v.forma)}</span>
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

      {/* Ações rápidas */}
      <div style={{
        background: "#fff", border: "1px solid #e5e3dc",
        borderRadius: 12, padding: "18px 20px",
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em",
          color: "#78716c", marginBottom: 12,
        }}>Ações rápidas</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Abrir PDV", icon: "🛒", href: "/loja/pdv", primary: true },
            { label: "Nova Compra", icon: "📥", href: "/loja/compras/nova", primary: false },
            { label: "Compras", icon: "📊", href: "/loja/compras", primary: false },
            { label: "Produtos", icon: "📦", href: "/loja/produtos", primary: false },
            { label: "Estoque", icon: "🏪", href: "/loja/estoque", primary: false },
            { label: "Fornecedores", icon: "🚚", href: "/loja/fornecedores", primary: false },
          ].map((a) => (
            <Link key={a.label} href={a.href} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 16px", borderRadius: 8,
              border: a.primary ? "none" : "1px solid #e5e3dc",
              background: a.primary ? "#E07B30" : "#fff",
              color: a.primary ? "#fff" : "#1c1917",
              fontSize: 13, fontWeight: 600,
              textDecoration: "none",
            }}>
              <span>{a.icon}</span>{a.label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
