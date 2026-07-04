import { COM_C, inputStyle } from './tokens'

interface FieldProps {
  label: string
  children: React.ReactNode
  hint?: string
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: COM_C.txtSub }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: '#A8A29E' }}>{hint}</span>}
    </div>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, ...props.style }} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', minHeight: 72, ...props.style }}
    />
  )
}