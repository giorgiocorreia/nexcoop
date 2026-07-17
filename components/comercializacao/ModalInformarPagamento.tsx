"use client"

import { useState, useRef } from "react"
import { processarPagamentoVendaAction } from "@/lib/comercializacao/devolucao"
import { parsearXmlDevolucao, type DadosDevolucao } from "@/lib/comercializacao/devolucao-xml"
import { fmt } from "@/lib/fmt"

interface Props {
  venda: {
    id: string
    quantidade_kg: number
    valor_bruto: number
    lote_codigo?: string
  }
  orgId: string
  onClose: () => void
  onSuccess: () => void
  /** Transferência interna não tem NF-e de saída emitida pela cooperativa —
   *  não existe devolução via XML/chave de NF-e nesse fluxo, só confirma o pagamento. */
  permiteDevolucao?: boolean
}

type Etapa = "pergunta" | "confirmar-simples" | "upload" | "confirmar" | "processando" | "concluido"

export default function ModalInformarPagamento({ venda, orgId, onClose, onSuccess, permiteDevolucao = true }: Props) {
  const [etapa, setEtapa]       = useState<Etapa>(permiteDevolucao ? "pergunta" : "confirmar-simples")
  const [dadosDev, setDadosDev] = useState<DadosDevolucao | null>(null)
  const [xmlRaw, setXmlRaw]     = useState("")
  const [chaveManual, setChaveManual] = useState("")
  const [kgManual, setKgManual]       = useState("")
  const [erro, setErro]               = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const cor   = "#92400e"
  const corLt = "#FDF8F4"

  async function handleArquivoXml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setXmlRaw(text)
    const parsed = parsearXmlDevolucao(text)
    if (parsed) {
      setDadosDev(parsed)
      setEtapa("confirmar")
    } else {
      setErro("Não foi possível extrair dados do XML. Verifique o arquivo ou informe manualmente.")
    }
  }

  function handleChaveManual() {
    const chave = chaveManual.replace(/\D/g, "")
    const kg    = parseFloat(kgManual.replace(",", "."))
    if (chave.length !== 44) { setErro("Chave deve ter 44 dígitos"); return }
    if (isNaN(kg) || kg <= 0) { setErro("Informe a quantidade devolvida em kg"); return }
    const valorUnitario = venda.valor_bruto / venda.quantidade_kg
    setDadosDev({
      chaveNfe: chave, nomeEmitente: "", dataEmissao: "",
      quantidadeKg: kg, valorUnitario,
      valorTotal: Math.round(kg * valorUnitario * 100) / 100,
    })
    setEtapa("confirmar")
  }

  async function handleConfirmar() {
    setEtapa("processando")
    setErro("")
    const result = await processarPagamentoVendaAction({
      vendaId: venda.id,
      orgId,
      devolucao: dadosDev ? {
        quantidadeKg:        dadosDev.quantidadeKg,
        valorUnitario:       dadosDev.valorUnitario,
        chaveNfeDevolucao:   dadosDev.chaveNfe,
        xmlNfeDevolucao:     xmlRaw || undefined,
      } : undefined,
    })
    if (result.success) {
      setEtapa("concluido")
      setTimeout(onSuccess, 1500)
    } else {
      setErro(result.error ?? "Erro ao processar")
      setEtapa(dadosDev ? "confirmar" : "pergunta")
    }
  }

  async function handleSemDevolucao() {
    setEtapa("processando")
    const result = await processarPagamentoVendaAction({ vendaId: venda.id, orgId })
    if (result.success) {
      setEtapa("concluido")
      setTimeout(onSuccess, 1500)
    } else {
      setErro(result.error ?? "Erro ao processar")
      setEtapa(permiteDevolucao ? "pergunta" : "confirmar-simples")
    }
  }

  const btn = (label: string, onClick: () => void, primary = false) => (
    <button onClick={onClick} style={{
      flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
      border: primary ? "none" : "1px solid #d1d5db",
      background: primary ? cor : "#fff",
      color: primary ? "#fff" : "#1C1917",
    }}>{label}</button>
  )

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", width: 480, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Informar Pagamento</div>
            <div style={{ fontSize: 12, color: "#78716C", marginTop: 2 }}>
              {venda.lote_codigo && `Lote ${venda.lote_codigo} · `}{fmt.peso(venda.quantidade_kg)} · {fmt.moeda(venda.valor_bruto)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#78716C" }}>✕</button>
        </div>

        {etapa === "pergunta" && (
          <div>
            <div style={{ background: corLt, border: `1px solid ${cor}30`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 14, color: cor, fontWeight: 600 }}>
              Houve devolução parcial de produto?
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {btn("Sim, houve devolução", () => setEtapa("upload"), true)}
              {btn("Não, pagamento integral", handleSemDevolucao)}
            </div>
            {erro && <div style={{ marginTop: 12, color: "#DC2626", fontSize: 12 }}>{erro}</div>}
          </div>
        )}

        {etapa === "confirmar-simples" && (
          <div>
            <div style={{ fontSize: 13, color: "#78716C", marginBottom: 20 }}>
              Transferência interna — sem NF-e de saída da cooperativa. Confirme o recebimento do pagamento.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {btn("Confirmar pagamento", handleSemDevolucao, true)}
            </div>
            {erro && <div style={{ marginTop: 12, color: "#DC2626", fontSize: 12 }}>{erro}</div>}
          </div>
        )}

        {etapa === "upload" && (
          <div>
            <div style={{ fontSize: 13, color: "#78716C", marginBottom: 16 }}>
              Faça upload do XML da NF-e de devolução emitida pelo comprador, ou informe a chave manualmente.
            </div>
            <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #d1d5db", borderRadius: 10, padding: 20, textAlign: "center", cursor: "pointer", background: "#F8F7F4", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#78716C" }}>📎<br />Clique para selecionar o arquivo XML</div>
              <input ref={fileRef} type="file" accept=".xml" style={{ display: "none" }} onChange={handleArquivoXml} />
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "#78716C", marginBottom: 16 }}>ou informe manualmente</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={chaveManual} onChange={e => setChaveManual(e.target.value)} placeholder="Chave de acesso (44 dígitos)" maxLength={44} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "monospace" }} />
              <input value={kgManual} onChange={e => setKgManual(e.target.value)} placeholder="Quantidade devolvida (kg)" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }} />
              {btn("Continuar", handleChaveManual, true)}
            </div>
            {erro && <div style={{ marginTop: 12, color: "#DC2626", fontSize: 12 }}>{erro}</div>}
          </div>
        )}

        {etapa === "confirmar" && dadosDev && (
          <div>
            <div style={{ fontSize: 13, color: "#78716C", marginBottom: 14 }}>Confirme os dados extraídos da NF-e:</div>
            {([
              ["Chave NF-e",              dadosDev.chaveNfe.substring(0, 20) + "..."],
              ["Quantidade devolvida",    fmt.peso(dadosDev.quantidadeKg)],
              ["Valor unitário",          fmt.moeda(dadosDev.valorUnitario) + "/kg"],
              ["Total devolvido",         fmt.moeda(dadosDev.valorTotal)],
              ["Valor líquido a receber", fmt.moeda(venda.valor_bruto - dadosDev.valorTotal)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6", fontSize: 13 }}>
                <span style={{ color: "#78716C" }}>{label}</span>
                <span style={{ fontWeight: 600, color: label === "Valor líquido a receber" ? "#16A34A" : "#1C1917" }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {btn("Voltar", () => setEtapa("upload"))}
              {btn("Confirmar e registrar pagamento", handleConfirmar, true)}
            </div>
            {erro && <div style={{ marginTop: 12, color: "#DC2626", fontSize: 12 }}>{erro}</div>}
          </div>
        )}

        {etapa === "processando" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 14, color: "#78716C" }}>Processando pagamento...</div>
          </div>
        )}

        {etapa === "concluido" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#16A34A" }}>Pagamento registrado!</div>
          </div>
        )}
      </div>
    </div>
  )
}
