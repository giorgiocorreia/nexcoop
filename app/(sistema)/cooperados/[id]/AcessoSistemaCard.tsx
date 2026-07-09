'use client'

import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { ContentCard, InfoRow, Badge, Field, Input, COM_C } from '@/components/nexcoop/ui'
import { gerarAcessoCooperado, enviarEmailBoasVindas } from '@/lib/cooperados/actions'
import type { AcessoCooperado } from './page'

interface Props {
  cooperadoId: string
  nome: string
  orgNome: string | null
  emailPadrao: string | null
  acessoInicial: AcessoCooperado
}

export default function AcessoSistemaCard({
  cooperadoId, nome, orgNome, emailPadrao, acessoInicial,
}: Props) {
  const [acesso, setAcesso] = useState<AcessoCooperado>(acessoInicial)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [email, setEmail] = useState(emailPadrao ?? '')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  const [senhaGerada, setSenhaGerada] = useState<string | null>(null)
  const [emailAcesso, setEmailAcesso] = useState<string | null>(null)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [erroEmail, setErroEmail] = useState<string | null>(null)

  async function handleGerar() {
    if (!email.trim()) {
      setErro('Informe um e-mail para criar o acesso.')
      return
    }
    setErro('')
    setGerando(true)
    try {
      const res = await gerarAcessoCooperado(cooperadoId, email.trim())
      if (!res.success) {
        setErro(res.error ?? 'Erro ao gerar acesso.')
        return
      }
      setAcesso({ temAcesso: true, email: res.email ?? email.trim(), ativo: true })
      setEmailAcesso(res.email ?? email.trim())
      setSenhaGerada(res.senhaTemporaria ?? null)
      setEmailEnviado(false)
      setErroEmail(null)
      setMostrarForm(false)
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao gerar acesso.')
    } finally {
      setGerando(false)
    }
  }

  async function handleEnviarEmail() {
    if (!senhaGerada || !emailAcesso) return
    setEnviandoEmail(true)
    setErroEmail(null)
    try {
      const res = await enviarEmailBoasVindas({
        nomeCooperado: nome,
        emailCooperado: emailAcesso,
        senhaTemporaria: senhaGerada,
        nomeOrg: orgNome ?? 'sua cooperativa',
        tipoMembro: 'cooperado',
      })
      if (res.success) setEmailEnviado(true)
      else setErroEmail(res.error ?? 'Erro ao enviar e-mail.')
    } catch (e: any) {
      setErroEmail(e?.message ?? 'Erro ao enviar e-mail.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  return (
    <ContentCard title="Acesso ao sistema">
      {acesso.temAcesso ? (
        <>
          <InfoRow label="E-mail de login" valor={acesso.email} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: COM_C.txtSub }}>Situação:</span>
            <Badge
              label={acesso.ativo ? 'Acesso ativo' : 'Acesso inativo'}
              bg={acesso.ativo ? '#EEF0FF' : '#f3f4f6'}
              cor={acesso.ativo ? '#4840CC' : '#374151'}
              dot
            />
          </div>
        </>
      ) : (
        <>
          {!mostrarForm && (
            <>
              <p style={{ fontSize: 13, color: COM_C.txtSub, margin: '0 0 12px', lineHeight: 1.5 }}>
                Este cooperado ainda não possui acesso à plataforma. Gere um login
                para que ele possa acessar sua área.
              </p>
              <Btn
                variante="azul"
                icone="ti-key"
                onClick={() => { setMostrarForm(true); setErro('') }}
              >
                Gerar acesso ao sistema
              </Btn>
            </>
          )}

          {mostrarForm && (
            <div style={{ maxWidth: 420 }}>
              <Field label="E-mail para login">
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </Field>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Btn variante="azul" icone="ti-key" onClick={handleGerar} disabled={gerando}>
                  {gerando ? 'Gerando...' : 'Confirmar e gerar'}
                </Btn>
                <Btn variante="cinza" onClick={() => { setMostrarForm(false); setErro('') }} disabled={gerando}>
                  Cancelar
                </Btn>
              </div>
            </div>
          )}
        </>
      )}

      {erro && (
        <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
          {erro}
        </div>
      )}

      {senhaGerada && (
        <div style={{ marginTop: 16, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>Acesso criado com sucesso</div>
          <div style={{ fontSize: 13, color: '#1E3A8A' }}>
            Senha temporária: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{senhaGerada}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 4 }}>
            Compartilhe esta senha com o cooperado. Ela não será exibida novamente.
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {emailEnviado ? (
              <span style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>✓ E-mail enviado para {emailAcesso}</span>
            ) : (
              <>
                <Btn variante="cinza" icone="ti-mail" tamanho="sm" onClick={handleEnviarEmail} disabled={enviandoEmail}>
                  {enviandoEmail ? 'Enviando...' : 'Enviar por e-mail'}
                </Btn>
                {erroEmail && <span style={{ fontSize: 12, color: '#991b1b' }}>{erroEmail}</span>}
              </>
            )}
          </div>
        </div>
      )}
    </ContentCard>
  )
}
