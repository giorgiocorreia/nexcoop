'use client'

// Recorte interativo da foto do cooperado, no formato 3:4 exigido pela
// carteirinha (moldura de 45×60pt no PDF, ver lib/carteirinha/pdf.ts).
//
// Por que existe (Giorgio, 24/07/2026): o recorte automático pelo centro
// (lib/cooperados/foto-imagem.ts) acerta em foto 3x4 mas erra em foto
// panorâmica — corta a cabeça ou deixa o rosto fora de enquadramento. Aqui a
// máscara 3:4 fica FIXA e o usuário move/aproxima a imagem por baixo dela,
// que é o modelo mental de qualquer editor de foto de perfil.
//
// Sem biblioteca de crop: canvas + pointer events dão conta, e evita somar
// dependência de UI ao bundle por uma tela só.

import { useCallback, useEffect, useRef, useState } from 'react'

// Mesma saída do recorte automático — 3:4, folga suficiente pra impressão.
const SAIDA_LARGURA = 675
const SAIDA_ALTURA = 900
const QUALIDADE_JPEG = 0.85

// Área de trabalho na tela (3:4). Cabe em celular sem rolagem lateral.
const PREVIEW_LARGURA = 264
const PREVIEW_ALTURA = 352

const ZOOM_MAX = 4

interface Props {
  arquivo: File
  onConfirmar: (arquivo: File) => void
  onCancelar: () => void
}

export default function FotoCropper({ arquivo, onConfirmar, onCancelar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bitmapRef = useRef<ImageBitmap | null>(null)
  const arrastandoRef = useRef<{ x: number; y: number } | null>(null)

  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [desloc, setDesloc] = useState({ x: 0, y: 0 })

  // Escala que faz a imagem COBRIR a máscara — piso do zoom, pra nunca
  // sobrar buraco vazio dentro do recorte.
  const escalaBase = useCallback(() => {
    const bm = bitmapRef.current
    if (!bm) return 1
    return Math.max(PREVIEW_LARGURA / bm.width, PREVIEW_ALTURA / bm.height)
  }, [])

  // Impede arrastar a imagem pra fora da máscara.
  const limitar = useCallback((d: { x: number; y: number }, z: number) => {
    const bm = bitmapRef.current
    if (!bm) return d
    const escala = escalaBase() * z
    const folgaX = Math.max(0, (bm.width * escala - PREVIEW_LARGURA) / 2)
    const folgaY = Math.max(0, (bm.height * escala - PREVIEW_ALTURA) / 2)
    return {
      x: Math.min(folgaX, Math.max(-folgaX, d.x)),
      y: Math.min(folgaY, Math.max(-folgaY, d.y)),
    }
  }, [escalaBase])

  useEffect(() => {
    let cancelado = false
    createImageBitmap(arquivo)
      .then(bm => {
        if (cancelado) { bm.close(); return }
        bitmapRef.current = bm
        setPronto(true)
      })
      .catch(() => setErro('Não foi possível abrir esta imagem.'))
    return () => {
      cancelado = true
      bitmapRef.current?.close()
      bitmapRef.current = null
    }
  }, [arquivo])

  // Redesenha a prévia a cada mudança de zoom/posição.
  useEffect(() => {
    const canvas = canvasRef.current
    const bm = bitmapRef.current
    if (!canvas || !bm || !pronto) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const escala = escalaBase() * zoom
    const largura = bm.width * escala
    const altura = bm.height * escala
    const x = (PREVIEW_LARGURA - largura) / 2 + desloc.x
    const y = (PREVIEW_ALTURA - altura) / 2 + desloc.y

    ctx.fillStyle = '#f4f4f5'
    ctx.fillRect(0, 0, PREVIEW_LARGURA, PREVIEW_ALTURA)
    ctx.drawImage(bm, x, y, largura, altura)
  }, [pronto, zoom, desloc, escalaBase])

  function aoPressionar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastandoRef.current = { x: e.clientX - desloc.x, y: e.clientY - desloc.y }
  }

  function aoMover(e: React.PointerEvent<HTMLCanvasElement>) {
    const inicio = arrastandoRef.current
    if (!inicio) return
    setDesloc(limitar({ x: e.clientX - inicio.x, y: e.clientY - inicio.y }, zoom))
  }

  function aoSoltar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    arrastandoRef.current = null
  }

  function aoMudarZoom(novo: number) {
    setZoom(novo)
    setDesloc(d => limitar(d, novo))
  }

  // Converte a área visível da máscara em coordenadas da imagem ORIGINAL e
  // gera o JPEG final na resolução de saída — o recorte é feito na imagem
  // cheia, não na prévia, pra não perder qualidade.
  async function confirmar() {
    const bm = bitmapRef.current
    if (!bm) return

    const escala = escalaBase() * zoom
    const largura = bm.width * escala
    const altura = bm.height * escala
    const xDesenho = (PREVIEW_LARGURA - largura) / 2 + desloc.x
    const yDesenho = (PREVIEW_ALTURA - altura) / 2 + desloc.y

    const sx = -xDesenho / escala
    const sy = -yDesenho / escala
    const sw = PREVIEW_LARGURA / escala
    const sh = PREVIEW_ALTURA / escala

    const saida = document.createElement('canvas')
    saida.width = SAIDA_LARGURA
    saida.height = SAIDA_ALTURA
    const ctx = saida.getContext('2d')
    if (!ctx) return

    // Fundo branco: PNG com transparência viraria preto no JPEG.
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, SAIDA_LARGURA, SAIDA_ALTURA)
    ctx.drawImage(bm, sx, sy, sw, sh, 0, 0, SAIDA_LARGURA, SAIDA_ALTURA)

    const blob = await new Promise<Blob | null>(resolve =>
      saida.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG)
    )
    if (!blob) return

    const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg'
    onConfirmar(new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() }))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recortar foto"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 340, width: '100%' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#18181b', marginBottom: 4 }}>
          Ajustar foto
        </div>
        <div style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>
          Arraste a imagem e use o zoom para enquadrar o rosto dentro da moldura.
        </div>

        {erro ? (
          <div style={{ fontSize: 13, color: '#b91c1c', padding: '12px 0' }}>{erro}</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={canvasRef}
                width={PREVIEW_LARGURA}
                height={PREVIEW_ALTURA}
                onPointerDown={aoPressionar}
                onPointerMove={aoMover}
                onPointerUp={aoSoltar}
                onPointerCancel={aoSoltar}
                style={{
                  width: PREVIEW_LARGURA, height: PREVIEW_ALTURA,
                  borderRadius: 8, border: '1px solid #e4e4e7',
                  cursor: 'grab', touchAction: 'none', background: '#f4f4f5',
                }}
              />
            </div>

            <label style={{ display: 'block', fontSize: 12, color: '#71717a', margin: '14px 0 4px' }}>
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={e => aoMudarZoom(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancelar}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid #d4d4d8',
              background: '#fff', color: '#3f3f46', fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!pronto || !!erro}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: pronto && !erro ? '#16a34a' : '#a1a1aa', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: pronto && !erro ? 'pointer' : 'default',
            }}
          >
            Cortar e enviar
          </button>
        </div>
      </div>
    </div>
  )
}
