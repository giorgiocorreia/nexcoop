'use client'

// Upload da própria foto pelo filiado — usada na carteirinha digital.
// Validação de tipo/tamanho já roda no server action (atualizarFotoPropriaCooperado);
// aqui é só uma checagem rápida pra feedback imediato, não é a fonte de verdade.

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { atualizarFotoPropriaCooperado } from '@/lib/cooperados/foto-actions'
import { redimensionarFoto } from '@/lib/cooperados/foto-imagem'
import FotoCropper from '@/components/nexcoop/FotoCropper'

interface Props {
  fotoUrl: string | null
  nome: string
  onFotoAtualizada: (url: string) => void
}

export default function FotoFiliadoUpload({ fotoUrl, nome, onFotoAtualizada }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  // Arquivo escolhido aguardando o recorte 3:4 no FotoCropper.
  const [aRecortar, setARecortar] = useState<File | null>(null)

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite selecionar o mesmo arquivo de novo depois
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

    // Abre o recorte antes de enviar — o filiado enquadra o próprio rosto.
    setARecortar(file)
  }

  async function enviar(file: File) {
    setARecortar(null)
    setEnviando(true)
    try {
      // O cropper já devolve 3:4 na resolução final; redimensionarFoto fica
      // como rede de segurança caso o canvas falhe e volte o arquivo cru.
      const pronta = await redimensionarFoto(file)
      const formData = new FormData()
      formData.append('foto', pronta)
      const res = await atualizarFotoPropriaCooperado(formData)
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
    <div style={{
      background: '#fff', border: '1px solid #E7E5E4', borderRadius: 14,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotoUrl} alt={nome} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: '#F5F3FF', color: '#635BFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
        }} aria-hidden>
          {nome.trim().charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>Foto da carteirinha</div>
        <div style={{ fontSize: 11, color: '#78716C' }}>PNG ou JPEG — até 5 MB</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleArquivo}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        style={{
          padding: '7px 14px', borderRadius: 8, border: '1.5px solid #635BFF',
          background: enviando ? '#EEF0FF' : '#fff', color: '#635BFF',
          fontSize: 12, fontWeight: 700, cursor: enviando ? 'wait' : 'pointer',
          whiteSpace: 'nowrap', fontFamily: 'inherit',
        }}
      >
        {enviando ? 'Enviando…' : fotoUrl ? 'Trocar foto' : 'Adicionar foto'}
      </button>

      {aRecortar && (
        <FotoCropper
          arquivo={aRecortar}
          onConfirmar={enviar}
          onCancelar={() => setARecortar(null)}
        />
      )}
    </div>
  )
}
