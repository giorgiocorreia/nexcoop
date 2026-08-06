"use client"
import { useState } from "react"
import { gerarRecibo } from "./actions"
import { gerarReciboPDF } from "@/lib/pdf/recibo"
import {
  type DirecaoRecibo,
  type TipoRecibo,
  DESCRICAO_SUGERIDA,
  DIRECAO_PADRAO,
  TIPOS_RECIBO,
  apenasDigitos,
  documentoValido,
  formatarMoeda,
  mascararDocumento,
  valorPorExtenso,
} from "@/lib/pdf/recibo-utils"
import { Btn } from "@/components/ui/Btn"
import { Modal } from "@/components/comercializacao/ui/Modal"
import { Field, Input, Select, Textarea } from "@/components/comercializacao/ui/Field"
import { COM_C } from "@/components/comercializacao/ui/tokens"

interface Props {
  onClose: () => void
}

export function ReciboModal({ onClose }: Props) {
  const [tipo, setTipo] = useState<TipoRecibo>("prestacao_servico")
  const [direcao, setDirecao] = useState<DirecaoRecibo>(DIRECAO_PADRAO.prestacao_servico)
  const [nome, setNome] = useState("")
  const [doc, setDoc] = useState("")
  // Valor em centavos: o input trabalha só com dígitos e a máscara é derivada,
  // então digitar "1234" vira R$ 12,34 sem o usuário caçar a vírgula.
  const [centavos, setCentavos] = useState(0)
  const [descricao, setDescricao] = useState(DESCRICAO_SUGERIDA.prestacao_servico)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const valor = centavos / 100

  /**
   * Troca de tipo reescreve a descrição apenas enquanto ela ainda for a
   * sugestão de outro tipo (ou estiver vazia) — texto que o usuário digitou
   * nunca é descartado por mexer no select.
   */
  function handleTipo(novo: TipoRecibo) {
    const sugestoes = Object.values(DESCRICAO_SUGERIDA)
    const intocada = descricao.trim() === "" || sugestoes.includes(descricao)

    setTipo(novo)
    setDirecao(DIRECAO_PADRAO[novo])
    if (intocada) setDescricao(DESCRICAO_SUGERIDA[novo])
  }

  const docInvalido = doc.length > 0 && !documentoValido(doc)

  const podeGerar =
    nome.trim().length >= 3 &&
    descricao.trim().length >= 3 &&
    centavos > 0 &&
    !docInvalido

  async function handleGerar() {
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await gerarRecibo({
        tipo,
        direcao,
        pessoaNome: nome.trim(),
        pessoaDoc: doc,
        valor,
        descricao: descricao.trim(),
      })
      if (!resultado.ok) { setErro(resultado.erro); return }

      const pdfBytes = await gerarReciboPDF({
        numero: resultado.numero,
        tipo,
        direcao,
        pessoaNome: nome.trim(),
        pessoaDoc: apenasDigitos(doc) || null,
        valor,
        descricao: descricao.trim(),
        emitidoEm: new Date(resultado.emitidoEm),
        org: resultado.org,
      })

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `recibo-${String(resultado.numero).padStart(5, "0")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e: any) {
      setErro(e.message ?? "Erro inesperado")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Modal
      titulo="Gerar Recibo"
      subtitulo="Duas vias na mesma folha A4, com linha de corte."
      onClose={onClose}
      largura={520}
      footer={
        <>
          <Btn variante="cinza" onClick={onClose}>Cancelar</Btn>
          <Btn variante="marrom" onClick={handleGerar} disabled={carregando || !podeGerar}>
            {carregando ? "Gerando PDF..." : "Gerar PDF"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Tipo de recibo">
          <Select value={tipo} onChange={e => handleTipo(e.target.value as TipoRecibo)}>
            {TIPOS_RECIBO.map(t => (
              <option key={t.valor} value={t.valor}>{t.label}</option>
            ))}
          </Select>
        </Field>

        <Field
          label="Quem recebeu o dinheiro"
          hint="Define o texto impresso e quem assina o recibo."
        >
          <div style={{ display: "flex", gap: 8 }}>
            <BotaoDirecao
              ativo={direcao === "pagamos"}
              onClick={() => setDirecao("pagamos")}
              titulo="A pessoa"
              descricao="A cooperativa pagou"
            />
            <BotaoDirecao
              ativo={direcao === "recebemos"}
              onClick={() => setDirecao("recebemos")}
              titulo="A cooperativa"
              descricao="A pessoa pagou"
            />
          </div>
        </Field>

        <Field label="Nome completo">
          <Input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome da pessoa ou empresa"
            maxLength={120}
            autoFocus
          />
        </Field>

        <Field label="CPF / CNPJ" hint="Opcional. Sai impresso no recibo quando informado.">
          <Input
            value={mascararDocumento(doc)}
            onChange={e => setDoc(apenasDigitos(e.target.value).slice(0, 14))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            style={docInvalido ? { borderColor: COM_C.vermelho } : undefined}
          />
          {docInvalido && (
            <span style={{ fontSize: 11, color: COM_C.vermelho }}>
              Documento inválido — confira os dígitos.
            </span>
          )}
        </Field>

        <Field label="Valor">
          <Input
            value={formatarMoeda(valor)}
            onChange={e => {
              const digitos = apenasDigitos(e.target.value).slice(0, 10)
              setCentavos(Number(digitos || 0))
            }}
            inputMode="numeric"
            style={{ fontSize: 18, fontWeight: 700 }}
          />
          {centavos > 0 && (
            <span style={{ fontSize: 11, color: COM_C.txtSub, fontStyle: "italic" }}>
              {valorPorExtenso(valor)}
            </span>
          )}
        </Field>

        <Field label="Descrição" hint={`Texto sugerido pelo tipo — edite à vontade. ${descricao.length}/500`}>
          <Textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            placeholder="Referente a..."
          />
        </Field>

        {erro && (
          <div style={{
            background: COM_C.vermelhoLt, border: "1px solid #fecaca", borderRadius: 8,
            padding: "10px 14px", fontSize: 13, color: COM_C.vermelho,
          }}>
            {erro}
          </div>
        )}
      </div>
    </Modal>
  )
}

function BotaoDirecao({ ativo, onClick, titulo, descricao }: {
  ativo: boolean
  onClick: () => void
  titulo: string
  descricao: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 8,
        cursor: "pointer",
        background: ativo ? COM_C.marromLt : "#fff",
        border: `1px solid ${ativo ? COM_C.marrom : COM_C.borda}`,
        fontFamily: "inherit",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: ativo ? COM_C.marromDk : COM_C.txt }}>
        {titulo}
      </div>
      <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 2 }}>{descricao}</div>
    </button>
  )
}
