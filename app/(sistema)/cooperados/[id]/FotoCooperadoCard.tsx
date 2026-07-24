'use client'

// Card de upload/troca da foto do cooperado, usada na carteirinha de
// identificação (/v/{codigo} e /filiado/carteirinha). Validação de
// tipo/tamanho definitiva roda no server action; aqui é só feedback rápido.

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ContentCard, COM_C } from '@/components/nexcoop/ui'
import { Btn } from '@/components/ui/Btn'
import { atualizarFotoCooperadoAdmin } from '@/lib/cooperados/foto-actions'

interface Props {
  cooperadoId: string
  nome: string
  fotoUrl: string | null
  onFotoAtualizada: (url: string) => void
}

export default function FotoCooperadoCard({ cooperadoId, nome, fotoUrl, onFotoAtualizada }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    // PNG/JPEG apenas — pdf-lib (gerador da carteirinha em PDF, fase 3) não
    // embute WEBP/GIF, então nem deixamos subir esses formatos.
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('Formato inválido. Envie PNG ou JPEG.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. O limite é 5 MB.')
      return
    }

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('foto', file)
      const res = await atualizarFotoCooperadoAdmin(cooperadoId, formData)
      if (res.error) {
        toast.error(res.error)
      } else if (res.url) {
        onFotoAtualizada(res.url)
        toast.success('Foto atualizada com sucesso.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar a foto.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ContentCard title="Foto">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt={nome} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${COM_C.borda}` }} />
        ) : (
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: COM_C.roxoLt, color: COM_C.roxo,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0,
          }} aria-hidden>
            {nome.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: COM_C.txtSub, margin: '0 0 8px', lineHeight: 1.4 }}>
            Foto usada na carteirinha de identificação (PNG ou JPEG, até 5 MB).
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleArquivo}
            style={{ display: 'none' }}
          />
          <Btn variante="cinza" icone="ti-upload" tamanho="sm" onClick={() => inputRef.current?.click()} disabled={enviando}>
            {enviando ? 'Enviando...' : fotoUrl ? 'Trocar foto' : 'Enviar foto'}
          </Btn>
        </div>
      </div>
    </ContentCard>
  )
}
