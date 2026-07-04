"use client"
import { useState } from "react"
import { reservarFichasPesagem } from "./actions"
import { gerarFichasPesagemPDF } from "@/lib/pdf/fichasPesagem"
import { Btn } from "@/components/ui/Btn"
import { PageLayout } from "@/components/comercializacao/ui/PageLayout"
import { Modal } from "@/components/comercializacao/ui/Modal"
import { Field, Input } from "@/components/comercializacao/ui/Field"
import { ListRow } from "@/components/comercializacao/ui/ListRow"
import { COM_C } from "@/components/comercializacao/ui/tokens"

export default function ImpressosPage() {
  const [modalAberto, setModalAberto] = useState(false)
  const [paginas, setPaginas] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleGerar() {
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await reservarFichasPesagem(paginas)
      if (resultado.erro) { setErro(resultado.erro); return }

      const pdfBytes = await gerarFichasPesagemPDF({
        inicio: resultado.inicio,
        fim: resultado.fim,
        orgNome: resultado.orgNome,
        orgLogoUrl: resultado.orgLogo,
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
    <PageLayout
      titulo="Impressos"
      breadcrumb={[{ label: "Impressos" }]}
      icone="ti-printer"
      fullHeight
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ListRow
          onClick={() => setModalAberto(true)}
          icone="ti-weight"
          iconeBg={COM_C.marromLt}
          iconeCor={COM_C.marrom}
          titulo="Ficha de Pesagem"
          subtitulo="8 fichas por página A4 · Numeração automática · PDF pronto para impressão"
          badges={<span />}
        />

        <ListRow
          onClick={() => {
            const a = document.createElement("a")
            a.href = "/impressos/ficha-cadastro-coopaibi.pdf"
            a.download = "ficha-cadastro-coopaibi.pdf"
            a.click()
          }}
          icone="ti-user-plus"
          iconeBg={COM_C.marromLt}
          iconeCor={COM_C.marrom}
          titulo="Ficha de Cadastro"
          subtitulo="Admissão de cooperado · Cooperado Pleno e Colaborador · PDF para impressão"
          badges={<span />}
        />
      </div>

      {modalAberto && (
        <Modal
          titulo="Ficha de Pesagem"
          subtitulo="Cada página contém 8 fichas com numeração sequencial."
          onClose={() => { setModalAberto(false); setErro(null) }}
          largura={360}
          footer={
            <>
              <Btn variante="cinza" onClick={() => { setModalAberto(false); setErro(null) }}>
                Cancelar
              </Btn>
              <Btn variante="marrom" onClick={handleGerar} disabled={carregando}>
                {carregando ? "Gerando PDF..." : "Gerar PDF"}
              </Btn>
            </>
          }
        >
          <Field label="Número de páginas">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Btn variante="cinza" onClick={() => setPaginas(p => Math.max(1, p - 1))} style={{ width: 36, height: 36, padding: 0, justifyContent: "center" }}>
                −
              </Btn>
              <Input
                type="number"
                min={1}
                max={50}
                value={paginas}
                onChange={e => setPaginas(Math.max(1, Math.min(50, Number(e.target.value))))}
                style={{ width: 64, textAlign: "center", fontSize: 18, fontWeight: 700 }}
              />
              <Btn variante="cinza" onClick={() => setPaginas(p => Math.min(50, p + 1))} style={{ width: 36, height: 36, padding: 0, justifyContent: "center" }}>
                +
              </Btn>
            </div>
          </Field>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: -4 }}>{paginas * 8} fichas no total</div>

          {erro && (
            <div style={{ background: COM_C.vermelhoLt, border: `1px solid #fecaca`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: COM_C.vermelho, marginTop: 12 }}>
              {erro}
            </div>
          )}
        </Modal>
      )}
    </PageLayout>
  )
}