import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const MODULOS = ['', 'auth', 'contabil', 'financeiro', 'parceiro']

function fmt(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default async function ConfigLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string; inicio?: string; fim?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('role, funcoes, organizacao_id').eq('id', user.id).single()
  const isAdmin = usuario?.role === 'super_admin' || (usuario?.funcoes ?? []).includes('admin')
  if (!isAdmin) redirect('/dashboard')

  const params = await searchParams

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (params.modulo) query = query.eq('modulo', params.modulo)
  if (params.inicio) query = query.gte('created_at', params.inicio)
  if (params.fim)    query = query.lte('created_at', params.fim + 'T23:59:59')

  const { data: logs } = await query

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/configuracoes" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>← Configurações</a>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '8px 0 4px' }}>Logs de Auditoria</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{logs?.length ?? 0} registros mais recentes da sua organização</p>
      </div>

      {/* Filtros */}
      <form method="GET" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <select name="modulo" defaultValue={params.modulo ?? ''} style={sel}>
          <option value="">Todos os módulos</option>
          {MODULOS.slice(1).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input name="inicio" type="date" defaultValue={params.inicio ?? ''} style={sel} />
        <input name="fim"    type="date" defaultValue={params.fim    ?? ''} style={sel} />
        <button type="submit" style={btnFiltro}>Filtrar</button>
        <a href="/configuracoes/logs" style={{ ...btnFiltro, textDecoration: 'none', background: '#fff', color: '#374151', border: '1px solid #e5e3dc' }}>
          Limpar
        </a>
      </form>

      {(logs ?? []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
          Nenhum log encontrado.
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Data/hora', 'Usuário', 'Módulo', 'Ação', 'Descrição'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log: any, i: number) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmt(log.created_at)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.usuario_email ?? log.usuario_id ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: MODULO_COR[log.modulo]?.bg ?? '#f3f4f6', color: MODULO_COR[log.modulo]?.cor ?? '#374151' }}>
                      {log.modulo}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 500 }}>{log.acao}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#374151', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.descricao ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const MODULO_COR: Record<string, { bg: string; cor: string }> = {
  auth:       { bg: '#EEF0FF', cor: '#4840CC' },
  contabil:   { bg: '#E6F7F1', cor: '#0F766E' },
  financeiro: { bg: '#FAECE7', cor: '#993C1D' },
  parceiro:   { bg: '#fef9c3', cor: '#854d0e' },
}

const sel: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #e5e3dc',
  borderRadius: 8, fontSize: 13, background: '#fff', color: '#1a1a1a',
}

const btnFiltro: React.CSSProperties = {
  padding: '8px 16px', background: '#1a1a2e', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
