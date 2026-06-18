"use client";

import { useState } from "react";
import Link from "next/link";
import { salvarFiscalLoja } from "@/lib/loja/fiscal-actions";
import type { Organizacao } from "@/types/database";

interface Props {
  org: Organizacao;
  produtosSemNcm: number;
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e3dc",
  borderRadius: 12,
  padding: 24,
  marginBottom: 16,
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#555",
  marginBottom: 5,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 14,
  border: "1px solid #d5d3cc",
  borderRadius: 8,
  background: "#fff",
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
};

const hint: React.CSSProperties = {
  fontSize: 11,
  color: "#888",
  marginTop: 4,
  display: "block",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 15,
  fontWeight: 600,
  color: "#1a1a1a",
};

export default function FiscalLojaClient({ org, produtosSemNcm }: Props) {
  const [cscId, setCscId]       = useState(org.loja_nfce_csc_id ?? "");
  const [cscToken, setCscToken] = useState(org.loja_nfce_csc_token ?? "");
  const [nfceSerie, setNfceSerie] = useState(org.loja_nfce_serie ?? "001");
  const [nfeSerie, setNfeSerie]   = useState(org.loja_nfe_saida_serie ?? "001");
  const [regime, setRegime]       = useState(org.loja_regime_tributario ?? "simples");
  const [salvando, setSalvando]   = useState(false);
  const [salvo, setSalvo]         = useState(false);
  const [erro, setErro]           = useState<string | null>(null);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setSalvo(false);

    const res = await salvarFiscalLoja(org.id, {
      loja_nfce_csc_id:       cscId.trim() || null,
      loja_nfce_csc_token:    cscToken.trim() || null,
      loja_regime_tributario: regime,
      loja_nfce_serie:        nfceSerie.trim() || "001",
      loja_nfe_saida_serie:   nfeSerie.trim() || "001",
    });

    setSalvando(false);
    if (!res.sucesso) { setErro(res.erro ?? "Erro ao salvar."); return; }
    setSalvo(true);
    setTimeout(() => setSalvo(false), 4000);
  }

  const nfceConfigurado = !!cscId && !!cscToken;

  return (
    <div style={{ maxWidth: 720, fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>NexCoop</Link>
        <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
        <Link href="/configuracoes" style={{ fontSize: 13, color: "#78716c", textDecoration: "none" }}>Configurações</Link>
        <span style={{ fontSize: 13, color: "#e5e3dc" }}>/</span>
        <span style={{ fontSize: 13, color: "#78716c", fontWeight: 600 }}>Fiscal da Loja</span>
      </div>

      <form onSubmit={handleSalvar}>

        {/* Seção 1 — NFC-e */}
        <div style={card}>
          <h2 style={sectionTitle}>NFC-e — Cupom Fiscal Eletrônico</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            <div>
              <label style={label}>CSC ID <span style={{ color: "#a8a29e", fontWeight: 400 }}>(6 dígitos)</span></label>
              <input
                value={cscId}
                onChange={e => setCscId(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000001"
                maxLength={6}
                inputMode="numeric"
                style={{ ...input, fontFamily: "monospace" }}
              />
            </div>

            <div>
              <label style={label}>CSC Token <span style={{ color: "#a8a29e", fontWeight: 400 }}>(36 caracteres)</span></label>
              <input
                value={cscToken}
                onChange={e => setCscToken(e.target.value.slice(0, 36))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                maxLength={36}
                style={{ ...input, fontFamily: "monospace" }}
              />
            </div>

            <div>
              <label style={label}>Série NFC-e</label>
              <input
                value={nfceSerie}
                onChange={e => setNfceSerie(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="001"
                maxLength={3}
                inputMode="numeric"
                style={{ ...input, fontFamily: "monospace", maxWidth: 100 }}
              />
            </div>

          </div>

          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: "#fefce8", border: "1px solid #fef08a", borderRadius: 8,
            fontSize: 12, color: "#854d0e", lineHeight: 1.5,
          }}>
            O CSC (Código de Segurança do Contribuinte) deve ser solicitado à SEFAZ do seu estado.
            Sem o CSC, a emissão de NFC-e não é possível.
          </div>
        </div>

        {/* Seção 2 — NF-e de Saída */}
        <div style={card}>
          <h2 style={sectionTitle}>NF-e de Saída</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            <div>
              <label style={label}>Série NF-e saída</label>
              <input
                value={nfeSerie}
                onChange={e => setNfeSerie(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="001"
                maxLength={3}
                inputMode="numeric"
                style={{ ...input, fontFamily: "monospace", maxWidth: 100 }}
              />
              <span style={hint}>Padrão: 001</span>
            </div>

            <div>
              <label style={label}>Regime tributário</label>
              <select
                value={regime}
                onChange={e => setRegime(e.target.value)}
                style={{ ...input, appearance: "auto" as any }}
              >
                <option value="simples">Simples Nacional</option>
                <option value="presumido">Lucro Presumido</option>
                <option value="real">Lucro Real</option>
              </select>
            </div>

          </div>
        </div>

        {/* Seção 3 — Status */}
        <div style={card}>
          <h2 style={sectionTitle}>Status da configuração fiscal</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#374151" }}>NFC-e (Cupom Fiscal)</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99,
                background: nfceConfigurado ? "#f0fdf4" : "#f5f5f4",
                color: nfceConfigurado ? "#15803d" : "#78716c",
                border: `1px solid ${nfceConfigurado ? "#bbf7d0" : "#e5e3dc"}`,
              }}>
                {nfceConfigurado ? "✓ Configurado" : "Não configurado"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#374151" }}>NF-e de Saída</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99,
                background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
              }}>
                ✓ Configurado
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#374151" }}>
                NCM dos produtos
                {produtosSemNcm > 0 && (
                  <span style={{ fontSize: 11, color: "#dc2626", marginLeft: 8 }}>
                    {produtosSemNcm} produto{produtosSemNcm !== 1 ? "s" : ""} sem NCM
                  </span>
                )}
              </span>
              <Link href="/loja/produtos" style={{
                fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 99,
                background: produtosSemNcm > 0 ? "#fef2f2" : "#f0fdf4",
                color: produtosSemNcm > 0 ? "#dc2626" : "#15803d",
                border: `1px solid ${produtosSemNcm > 0 ? "#fecaca" : "#bbf7d0"}`,
                textDecoration: "none",
              }}>
                {produtosSemNcm > 0 ? `${produtosSemNcm} sem NCM →` : "✓ Todos com NCM"}
              </Link>
            </div>

          </div>
        </div>

        {/* Feedback */}
        {erro && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
            padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#dc2626",
          }}>
            {erro}
          </div>
        )}
        {salvo && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
            padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#16a34a",
          }}>
            Configurações fiscais salvas com sucesso.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Link href="/configuracoes" style={{
            padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "transparent", color: "#374151",
            border: "1px solid #d5d3cc", textDecoration: "none",
            display: "inline-flex", alignItems: "center",
          }}>
            Voltar
          </Link>
          <button type="submit" disabled={salvando} style={{
            padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "#E07B30", color: "#fff", border: "1.5px solid #E07B30",
            cursor: salvando ? "not-allowed" : "pointer", opacity: salvando ? 0.7 : 1,
          }}>
            {salvando ? "Salvando…" : "Salvar configurações"}
          </button>
        </div>

      </form>
    </div>
  );
}
