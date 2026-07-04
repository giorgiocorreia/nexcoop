import { COM_C } from './tokens'
import { Btn } from '@/components/ui/Btn'

interface EmptyStateProps {
  emoji?: string
  titulo: string
  descricao?: string
  acao?: { label: string; onClick: () => void }
}

export function EmptyState({ emoji = '📋', titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
      padding: '3.5rem 2rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: COM_C.txt, marginBottom: 6 }}>{titulo}</div>
      {descricao && <div style={{ fontSize: 13, color: COM_C.txtSub, marginBottom: acao ? 20 : 0 }}>{descricao}</div>}
      {acao && (
        <Btn variante="marrom" icone="ti-plus" onClick={acao.onClick}>{acao.label}</Btn>
      )}
    </div>
  )
}