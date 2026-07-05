import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FiliadoSairButton from './FiliadoSairButton'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function FiliadoInicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/filiado/login')

  const admin = createAdminClient()

  const { data: usuario } = await admin
    .from('usuarios')
    .select('nome_completo, organizacao_id, role')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/filiado/login')

  const { data: cooperado } = await admin
    .from('cooperados')
    .select('id, nome_completo')
    .eq('usuario_id', user.id)
    .eq('organizacao_id', usuario.organizacao_id ?? '')
    .maybeSingle()

  const nome = cooperado?.nome_completo ?? usuario.nome_completo ?? 'Cooperado'

  let saldoFinanceiro: number | null = null
  let produtorId: string | null = null

  if (usuario.organizacao_id) {
    const { data: org } = await admin
      .from('organizacoes')
      .select('modulos_ativos, nome')
      .eq('id', usuario.organizacao_id)
      .single()

    const temComercializacao = (org?.modulos_ativos ?? []).includes('comercializacao')

    if (temComercializacao && cooperado?.id) {
      const { data: produtor } = await admin
        .from('produtores')
        .select('id, contas_produtor(saldo_financeiro)')
        .eq('cooperado_id', cooperado.id)
        .eq('organizacao_id', usuario.organizacao_id)
        .maybeSingle()

      produtorId = (produtor?.id as string) ?? null
      const conta = Array.isArray((produtor as any)?.contas_produtor)
        ? (produtor as any).contas_produtor[0]
        : (produtor as any)?.contas_produtor
      saldoFinanceiro = conta?.saldo_financeiro ?? 0
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E7E5E4',
        padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#78716C' }}>Ola,</p>
        <h1 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>{nome}</h1>

        {saldoFinanceiro !== null ? (
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Saldo em conta
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#15803D' }}>{fmt(saldoFinanceiro)}</div>
            {produtorId && (
              <a
                href={`/api/comercializacao/extrato-produtor/${produtorId}?tipo=total`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
                  fontSize: 13, fontWeight: 600, color: '#1D4ED8', textDecoration: 'none',
                }}
              >
                <i className="ti ti-file-type-pdf" /> Ver extrato (PDF)
              </a>
            )}
          </div>
        ) : (
          <div style={{
            background: '#FAFAF9', border: '1px solid #E7E5E4', borderRadius: 12,
            padding: '14px 16px', fontSize: 13, color: '#78716C',
          }}>
            Saldo em conta nao disponivel para sua cooperativa.
          </div>
        )}
      </div>

      <FiliadoSairButton />
    </div>
  )
}