"use client"
import { useState } from "react"
import Link from "next/link"
import { reservarFichasPesagem } from "./actions"
import { gerarFichasPesagemPDF } from "@/lib/pdf/fichasPesagem"

const COR = "#92400e"
const COR_LIGHT = "#FDF4E7"
const BORDA = "#E5E3DC"

export default function ImpressosPage() {
  const [modalAberto, setModalAberto] = useState(false)
  const [paginas, setPaginas] = useState(2)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleGerar() {
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await reservarFichasPesagem(paginas)
      if (resultado.erro) { setErro(resultado.erro); return }

      const hoje = new Date()
      const dataHoje = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`

      const pdfBytes = await gerarFichasPesagemPDF({
        inicio: resultado.inicio,
        fim: resultado.fim,
        orgNome: resultado.orgNome,
        orgLogoUrl: resultado.orgLogo,
        dataHoje,
      })

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fichas-pesagem-${resultado.inicio}-${resultado.fim}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setModalAberto(false)
    } catch (e: any) {
      setErro(e.message ?? "Erro inesperado")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      <style>{`
        .impressos-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .impressos-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .impressos-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .impressos-content { padding: 16px; }
        }
      `}</style>

      <header className="impressos-header" style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#fff", borderBottom: `1px solid ${BORDA}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, margin: "0 -2rem 0 -2rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: COR_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-printer" style={{ fontSize: 20, color: COR }} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1C1917", margin: 0, lineHeight: 1.2 }}>Impressos</h1>
            <div style={{ fontSize: 12, color: "#78716C", marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: "#78716C", textDecoration: "none" }}>Comercialização</Link>
              {" / "}Impressos
            </div>
          </div>
        </div>
      </header>

      <div className="impressos-content" style={{ background: "#F8F7F4", margin: "0 -2rem -2rem -2rem", minHeight: "calc(100vh - 88px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>

          {/* Ficha de Pesagem */}
          <div
            onClick={() => setModalAberto(true)}
            style={{ background: "#fff", border: `1px solid ${BORDA}`, borderRadius: 12, borderTop: `3px solid ${COR}`, padding: 24, cursor: "pointer", transition: "box-shadow 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: COR_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <i className="ti ti-weight" style={{ fontSize: 22, color: COR }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>Ficha de Pesagem</div>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>8 fichas por página A4 · Numeração automática · PDF pronto para impressão</div>
          </div>

          {/* Ficha de Cadastro — em breve */}
          <div style={{ background: "#fff", border: `1px solid ${BORDA}`, borderRadius: 12, borderTop: "3px solid #6b7280", padding: 24, opacity: 0.6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <i className="ti ti-user-plus" style={{ fontSize: 22, color: "#6b7280" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>Ficha de Cadastro</div>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>Formulário de admissão de cooperado · Em breve</div>
          </div>

        </div>
      </div>

      {/* Modal Ficha de Pesagem */}
      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Ficha de Pesagem</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Cada página contém 8 fichas com numeração sequencial.</div>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Número de páginas
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <button onClick={() => setPaginas(p => Math.max(1, p - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${BORDA}`, background: "#fff", fontSize: 18, cursor: "pointer", fontWeight: 600 }}>−</button>
              <input
                type="number" min={1} max={50} value={paginas}
                onChange={e => setPaginas(Math.max(1, Math.min(50, Number(e.target.value))))}
                style={{ width: 64, textAlign: "center", fontSize: 18, fontWeight: 700, border: `1px solid ${BORDA}`, borderRadius: 8, padding: "6px 0" }}
              />
              <button onClick={() => setPaginas(p => Math.min(50, p + 1))} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${BORDA}`, background: "#fff", fontSize: 18, cursor: "pointer", fontWeight: 600 }}>+</button>
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 24 }}>{paginas * 8} fichas no total</div>

            {erro && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c", marginBottom: 16 }}>
                {erro}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setModalAberto(false); setErro(null) }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${BORDA}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={handleGerar}
                disabled={carregando}
                style={{ flex: 2, padding: "10px 0", borderRadius: 8, border: "none", background: carregando ? "#d1d5db" : COR, color: "#fff", fontSize: 13, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer" }}
              >
                {carregando ? "Gerando PDF..." : "Gerar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
