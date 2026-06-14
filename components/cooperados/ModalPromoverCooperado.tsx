'use client'

import { useState, useTransition } from 'react'
import { Btn } from '@/components/ui/Btn'
import { promoverProdutorACooperado } from '@/lib/cooperados/actions'
import type { StatusCooperado } from '@/types/database'

interface Props {
  produtorId: string
  nome: string
  cpf: string | null
  emailAtual: string | null
  organizacaoId: string
  onClose: () => void
  onSucesso: (senhaTemporaria?: string, emailLogin?: string) => void
}

const inp: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e5e3dc',
  borderRadius: '8px',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fff',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b6b6b',
  display: 'block',
  marginBottom: '4px',
}

const blocoTitulo: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#9a9a9a',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '12px',
}

export default function ModalPromoverCooperado({
  produtorId, nome, cpf, emailAtual, organizacaoId, onClose, onSucesso,
}: Props) {
  const hoje = new Date().toISOString().split('T')[0]

  const [email, setEmail]                   = useState(emailAtual ?? '')
  const [status, setStatus]                 = useState<StatusCooperado>('ativo')
  const [dataAdmissao, setDataAdmissao]     = useState(hoje)
  const [numeroMatricula, setNumeroMatricula] = useState('')
  const [quotaParte, setQuotaParte]         = useState('')
  const [cafNumero, setCafNumero]           = useState('')
  const [cafSituacao, setCafSituacao]       = useState('')
  const [cafValidade, setCafValidade]       = useState('')
  const [dapNumero, setDapNumero]           = useState('')
  const [erro, setErro]                     = useState('')
  const [isPending, startTransition]        = useTransition()

  function handleConfirmar() {
    if (!email.trim()) {
      setErro('E-mail para login é obrigatório.')
      return
    }
    setErro('')
    startTransition(async () => {
      try {
        const result = await promoverProdutorACooperado(organizacaoId, {
          produtorId,
          email: email.trim(),
          dadosCooperado: {
            status,
            data_admissao:    dataAdmissao   || undefined,
            numero_matricula: numeroMatricula || undefined,
            quota_parte:      quotaParte ? parseFloat(quotaParte) : undefined,
            caf_numero:       cafNumero   || undefined,
            caf_situacao:     cafSituacao || undefined,
            caf_validade:     cafValidade || undefined,
            dap_numero:       dapNumero   || undefined,
          },
        })
        if (!result.success) {
          setErro(result.error ?? 'Erro ao promover produtor.')
          return
        }
        onSucesso(result.senhaTemporaria, email.trim())
      } catch (e: any) {
        setErro(e.message ?? 'Erro ao promover produtor.')
      }
    })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e5e3dc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              {/* TODO: terminologia dinâmica via tipos_org */}
              Promover a Cooperado
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>{nome}</h2>
            {cpf && <div style={{ fontSize: '12px', color: '#9a9a9a', marginTop: '2px' }}>CPF: {cpf}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#aaa', lineHeight: 1, padding: '4px' }}
          >
            ×
          </button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>

          {/* Bloco: Dados de acesso */}
          <div style={{ marginBottom: '24px' }}>
            <div style={blocoTitulo}>Dados de acesso</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={labelStyle}>E-mail para login *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                style={inp}
              />
            </div>
          </div>

          {/* Bloco: Dados societários */}
          <div>
            <div style={blocoTitulo}>Dados societários</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as StatusCooperado)} style={inp}>
                  <option value="ativo">Ativo</option>
                  <option value="probatorio">Probatório</option>
                  <option value="inadimplente">Inadimplente</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Data de admissão</label>
                <input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Número de matrícula</label>
                <input value={numeroMatricula} onChange={e => setNumeroMatricula(e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Quota parte (R$)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={quotaParte}
                  onChange={e => setQuotaParte(e.target.value)}
                  style={inp}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>CAF número</label>
                <input value={cafNumero} onChange={e => setCafNumero(e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>CAF situação</label>
                <input value={cafSituacao} onChange={e => setCafSituacao(e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>CAF validade</label>
                <input type="date" value={cafValidade} onChange={e => setCafValidade(e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>DAP número</label>
                <input value={dapNumero} onChange={e => setDapNumero(e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {erro && (
            <div style={{
              marginTop: '16px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', color: '#991b1b',
            }}>
              {erro}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e5e3dc',
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
        }}>
          <Btn variante="cinza" tamanho="md" onClick={onClose} disabled={isPending}>
            Cancelar
          </Btn>
          <Btn variante="azul" tamanho="md" onClick={handleConfirmar} disabled={isPending}>
            {isPending ? 'Promovendo...' : 'Confirmar Promoção'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
