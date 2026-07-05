'use client'

import { PageLayout, MODULO_CONFIG, COM_C } from '@/components/nexcoop/ui'

function fmt(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const MODULO_COR: Record<string, { bg: string; cor: string }> = {
  auth:       { bg: COM_C.roxoLt, cor: '#4840CC' },
  contabil:   { bg: COM_C.verdeLt, cor: COM_C.verde },
  financeiro: { bg: '#FAECE7', cor: '#993C1D' },
  parceiro:   { bg: '#fef9c3', cor: '#854d0e' },
}

const sel: React.CSSProperties = {
  padding: '8px 12px', border: `1px solid ${COM_C.borda}`,
  borderRadius: 8, fontSize: 13, background: '#fff', color: COM_C.txt,
}

const btnFiltro: React.CSSProperties = {
  padding: '8px 16px', background: COM_C.txt, color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

interface Props {
  logs: any[]
  params: { modulo?: string; inicio?: string; fim?: string }
}

export default function ConfigLogsClient({ logs, params }: Props) {
  return (
    <PageLayout
      titulo="Logs de Auditoria"
      subtitulo={`${logs.length} registros mais recentes da sua organização`}
      icone="ti-list-search"
      modulo={MODULO_CONFIG}
      breadcrumb={[{ label: 'Logs de Auditoria' }]}
    >
      <form method="GET" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <select name="modulo" defaultValue={params.modulo ?? ''} style={sel}>
          <option value="">Todos os módulos</option>
          {['auth', 'contabil', 'financeiro', 'parceiro'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input name="inicio" type="date" defaultValue={params.inicio ?? ''} style={sel} />
        <input name="fim"    type="date" defaultValue={params.fim    ?? ''} style={sel} />
        <button type="submit" style={btnFiltro}>Filtrar</button>
        <a href="/configuracoes/logs" style={{ ...btnFiltro, textDecoration: 'none', background: '#fff', color: COM_C.txt, border: `1px solid ${COM_C.borda}` }}>
          Limpar
        </a>
      </form>

      {(logs ?? []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: `1px solid ${COM_C.borda}`, color: COM_C.txtSub }}>
          Nenhum log encontrado.
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${COM_C.borda}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: COM_C.txt }}>
                {['Data/hora', 'Usuário', 'Módulo', 'Ação', 'Descrição'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any, i: number) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : COM_C.bg }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: COM_C.txtSub, whiteSpace: 'nowrap' }}>{fmt(log.created_at)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.usuario_email ?? log.usuario_id ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: MODULO_COR[log.modulo]?.bg ?? '#f3f4f6', color: MODULO_COR[log.modulo]?.cor ?? COM_C.txt }}>
                      {log.modulo}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 500 }}>{log.acao}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: COM_C.txt, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.descricao ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  )
}