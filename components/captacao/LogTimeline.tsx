'use client'

import type { OportunidadeLogComUsuario } from '@/lib/captacao/actions'

const ACAO_LABEL: Record<string, string> = {
  criado:     'Oportunidade criada',
  movido:     'Status alterado',
  editado:    'Dados atualizados',
  comentario: 'Comentário adicionado',
  contato:    'Contato registrado',
  proposta:   'Proposta registrada',
}

const CANAL_LABEL: Record<string, string> = {
  email: 'E-mail', reuniao: 'Reunião', ligacao: 'Ligação',
  whatsapp: 'WhatsApp', outro: 'Outro',
}

function parseJson(s: string | null): Record<string, string> {
  try { return s ? JSON.parse(s) : {} } catch { return {} }
}

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  logs: OportunidadeLogComUsuario[]
}

export default function LogTimeline({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '1rem 0' }}>
        Nenhuma movimentação registrada.
      </p>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '20px' }}>
      {/* linha vertical */}
      <div style={{
        position: 'absolute', left: '7px', top: '8px',
        bottom: '8px', width: '2px', background: '#e5e3dc',
      }} />

      {logs.map((log, i) => (
        <div key={log.id} style={{ position: 'relative', marginBottom: i < logs.length - 1 ? '16px' : 0 }}>
          {/* ponto */}
          <div style={{
            position: 'absolute', left: '-16px', top: '4px',
            width: '10px', height: '10px', borderRadius: '50%',
            background: log.acao === 'criado' ? '#1D9E75'
              : log.acao === 'movido'   ? '#635BFF'
              : '#888',
            border: '2px solid #fff',
            boxShadow: '0 0 0 1px #e5e3dc',
          }} />

          <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a' }}>
            {ACAO_LABEL[log.acao] || log.acao}
            {log.status_anterior && log.status_novo && (
              <span style={{ fontWeight: '400', color: '#635BFF', marginLeft: '6px' }}>
                {log.status_anterior} → {log.status_novo}
              </span>
            )}
            {log.acao === 'contato' && (() => {
              const d = parseJson(log.descricao)
              return d.canal ? (
                <span style={{ fontWeight: '400', color: '#888', marginLeft: '6px' }}>
                  via {CANAL_LABEL[d.canal] ?? d.canal}
                </span>
              ) : null
            })()}
          </div>

          {log.acao === 'contato' || log.acao === 'proposta' ? (() => {
            const d = parseJson(log.descricao)
            const texto = log.acao === 'contato' ? d.descricao : `${d.status_proposta ? d.status_proposta + ' · ' : ''}${d.observacoes ?? ''}`
            return texto ? (
              <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{texto}</div>
            ) : null
          })() : log.descricao ? (
            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
              {log.descricao}
            </div>
          ) : null}

          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>
            {log.usuario?.nome_completo || 'Sistema'} · {formatDataHora(log.criado_em)}
          </div>
        </div>
      ))}
    </div>
  )
}
