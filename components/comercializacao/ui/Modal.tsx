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
      className="com-modal-backdrop"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <style>{`
        .com-modal-panel {
          background: #fff; border-radius: 16px; padding: 28px; width: 100%;
          max-height: 90vh; overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .com-modal-footer {
          display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;
        }
        @media (max-width: 640px) {
          .com-modal-backdrop {
            align-items: flex-end !important;
            padding: 0 !important;
            padding-bottom: env(safe-area-inset-bottom, 0) !important;
          }
          .com-modal-panel {
            max-width: 100% !important;
            max-height: min(92vh, 100%);
            border-radius: 16px 16px 0 0;
            padding: 20px 16px calc(16px + env(safe-area-inset-bottom, 0px));
            box-shadow: 0 -8px 32px rgba(0,0,0,0.18);
          }
          .com-modal-footer {
            flex-direction: column-reverse;
            align-items: stretch;
          }
          .com-modal-footer > * {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <div
        className="com-modal-panel"
        style={{ maxWidth: largura }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="com-modal-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div id="com-modal-title" style={{ fontWeight: 700, fontSize: 17, color: COM_C.txt }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 13, color: COM_C.txtSub, marginTop: 4 }}>{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              border: 'none', background: 'rgba(0,0,0,0.05)', fontSize: 20, cursor: 'pointer',
              color: COM_C.txtSub, lineHeight: 1, padding: 0, width: 36, height: 36,
              borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        {children}
        {footer && <div className="com-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
