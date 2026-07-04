'use client'

import { COM_C } from './tokens'

interface ModalProps {
  titulo: string
  subtitulo?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  largura?: number
}

export function Modal({ titulo, subtitulo, onClose, children, footer, largura = 420 }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: largura,
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: COM_C.txt }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 13, color: COM_C.txtSub, marginTop: 4 }}>{subtitulo}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: COM_C.txtSub, lineHeight: 1, padding: 0 }}
          >×</button>
        </div>
        {children}
        {footer && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  )
}