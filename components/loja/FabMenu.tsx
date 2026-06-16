"use client";
import { useState } from "react";
import Link from "next/link";

const acoes = [
  { label: "Fechar Caixa",        icon: "🔒", href: "/loja/pdv/fechar",        destaque: false },
  { label: "Produtos",            icon: "📦", href: "/loja/produtos",           destaque: false },
  { label: "Relatório de Vendas", icon: "📊", href: "/loja/relatorios/vendas",  destaque: false },
  { label: "Entrada NF-e",        icon: "📥", href: "/loja/entradas/nova",      destaque: false },
  { label: "Abrir PDV",           icon: "🛒", href: "/loja/pdv",                destaque: true  },
];

export default function FabMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 199 }}
        />
      )}

      <div style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 10,
        zIndex: 200,
      }}>
        {/* Itens do menu */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(12px)",
          pointerEvents: open ? "all" : "none",
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}>
          {acoes.map((a, i) => (
            <div key={a.label} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 0.18s ease ${i * 40}ms, transform 0.18s ease ${i * 40}ms`,
            }}>
              <Link href={a.href} onClick={() => setOpen(false)} style={{
                fontSize: 12,
                fontWeight: 600,
                color: a.destaque ? "#fff" : "#374151",
                background: a.destaque ? "#E07B30" : "#fff",
                padding: a.destaque ? "8px 18px" : "4px 12px",
                borderRadius: 99,
                border: a.destaque ? "none" : "1px solid #e5e3dc",
                whiteSpace: "nowrap",
                boxShadow: a.destaque
                  ? "0 4px 12px rgba(224,123,48,0.35)"
                  : "0 2px 6px rgba(0,0,0,0.06)",
                textDecoration: "none",
                display: "inline-block",
              }}>
                {a.icon} {a.label}
              </Link>

              {!a.destaque && (
                <Link href={a.href} onClick={() => setOpen(false)} style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "1px solid #e5e3dc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  textDecoration: "none",
                  flexShrink: 0,
                }}>
                  {a.icon}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* FAB principal */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Ações rápidas"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#E07B30",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 4px 16px rgba(224,123,48,0.4)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {open ? "✕" : "⚡"}
        </button>
      </div>
    </>
  );
}
