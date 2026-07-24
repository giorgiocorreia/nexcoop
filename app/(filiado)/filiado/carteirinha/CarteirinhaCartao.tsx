'use client'

// Carteirinha digital do filiado — tela otimizada para exibir na tela do
// celular pro conferente escanear (QR grande, cores fixas em tema claro,
// sem depender de dark mode: o card precisa ser legível de relance mesmo
// com o celular do usuário em modo escuro).

import { useState } from 'react'
import { corPrimariaOrg } from '@/lib/tema'
import type { TipoOrganizacao } from '@/types/database'
import FotoFiliadoUpload from './FotoFiliadoUpload'

interface CooperadoView {
  id: string
  nome: string
  numeroMatricula: string | null
  dataAdmissao: string | null
  fotoUrl: string | null
}

interface OrganizacaoView {
  nome: string
  logoUrl: string | null
  corPrimaria: string | null
  tipo: TipoOrganizacao
}

interface CarteirinhaView {
  codigo: string
  via: number
  emitidaEm: string
  validaAte: string | null
}

interface Props {
  temCarteirinha: boolean
  temCooperado: boolean
  cooperado: CooperadoView | null
  organizacao: OrganizacaoView | null
  qrSvg: string | null
  statusRotulo: string | null
  statusDetalhe: string | null
  carteirinha?: CarteirinhaView
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')
}

export default function CarteirinhaCartao({
  temCarteirinha, temCooperado, cooperado, organizacao, qrSvg, statusRotulo, statusDetalhe, carteirinha,
}: Props) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(cooperado?.fotoUrl ?? null)

  if (!temCooperado || !cooperado) {
    return (
      <div style={cardVazioStyle}>
        <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1917' }}>Cadastro não encontrado</div>
        <p style={{ fontSize: 13, color: '#78716C', marginTop: 6 }}>
          Não encontramos um cadastro de cooperado vinculado ao seu usuário. Fale com a secretaria/administração.
        </p>
      </div>
    )
  }

  const cor = corPrimariaOrg({ tipo: organizacao?.tipo ?? 'cooperativa', cor_primaria: organizacao?.corPrimaria ?? null })

  if (!temCarteirinha || !carteirinha) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={cardVazioStyle}>
          <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden>🪪</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1917' }}>Carteirinha ainda não emitida</div>
          <p style={{ fontSize: 13, color: '#78716C', marginTop: 6, lineHeight: 1.5 }}>
            A emissão da carteirinha de identificação é feita pela secretaria/administração
            da sua {organizacao?.tipo === 'associacao' ? 'associação' : 'cooperativa'}. Procure-os para solicitar a emissão.
          </p>
        </div>
        <FotoFiliadoUpload fotoUrl={fotoUrl} nome={cooperado.nome} onFotoAtualizada={setFotoUrl} />
      </div>
    )
  }

  const valida = statusRotulo === 'ATIVO'
  const corSemaforo = valida ? '#16a34a' : '#dc2626'
  const bgSemaforo = valida ? '#dcfce7' : '#fee2e2'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Semáforo — mesma leitura de relance da página pública /v/{codigo} */}
      <div style={{
        background: bgSemaforo, border: `2px solid ${corSemaforo}`, borderRadius: 14,
        padding: '12px 16px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: corSemaforo, letterSpacing: 0.5 }}>
          {statusRotulo}
        </div>
        {statusDetalhe && (
          <div style={{ fontSize: 12, color: corSemaforo, marginTop: 2, fontWeight: 500 }}>{statusDetalhe}</div>
        )}
      </div>

      {/* Cartão — proporção próxima de CR80 (85.6 x 54mm), cores fixas
          (não usa @media prefers-color-scheme de propósito). */}
      <div style={{
        background: '#ffffff', borderRadius: 18, border: '1px solid #E7E5E4',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden',
      }}>
        <div style={{
          background: cor, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {organizacao?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organizacao.logoUrl} alt={organizacao.nome} style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover', background: '#fff' }} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.25)' }} aria-hidden />
          )}
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{organizacao?.nome ?? 'NexCoop'}</div>
        </div>

        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt={cooperado.nome} style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${cor}`, flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 68, height: 68, borderRadius: '50%', background: cor, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, flexShrink: 0,
              }} aria-hidden>
                {cooperado.nome.trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1917', lineHeight: 1.25 }}>{cooperado.nome}</div>
              {cooperado.numeroMatricula && (
                <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>Matrícula {cooperado.numeroMatricula}</div>
              )}
              <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>Filiado desde {formatarData(cooperado.dataAdmissao)}</div>
            </div>
          </div>

          {/* QR grande, fundo branco puro e margem própria — brilho máximo
              pra facilitar leitura por leitor de código em ambiente variado. */}
          {qrSvg && (
            <div
              style={{
                background: '#fff', border: '1px solid #E7E5E4', borderRadius: 12,
                padding: 16, display: 'flex', justifyContent: 'center',
              }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 11, color: '#A8A29E' }}>
            <span>Código {carteirinha.codigo}</span>
            <span>Via {carteirinha.via}</span>
          </div>
          {carteirinha.validaAte && (
            <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>
              Válida até {formatarData(carteirinha.validaAte)}
            </div>
          )}
        </div>
      </div>

      <FotoFiliadoUpload fotoUrl={fotoUrl} nome={cooperado.nome} onFotoAtualizada={setFotoUrl} />
    </div>
  )
}

const cardVazioStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #E7E5E4', borderRadius: 16,
  padding: '28px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
}
