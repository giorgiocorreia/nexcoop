import { buscarCotacoesVitrine } from '@/lib/site/queries'
import { formatarBRL, formatarDataCurta } from '@/lib/site/site-utils'

// Único elemento NOVO permitido no porte fiel da home (ver tarefa): faixa
// discreta de cotação do dia, usando a query já existente do módulo Site.
// Estilizada com as variáveis CSS do próprio site original (public/sites/
// coopaibi/css/style.css) pra não destoar do restante — sem depender do
// design system Tailwind do template genérico.
export default async function CoopaibiCotacaoStrip({ orgId }: { orgId: string }) {
  const cotacoes = await buscarCotacoesVitrine(orgId)
  if (cotacoes.length === 0) return null

  return (
    <div style={{ background: 'var(--gp, #e8f5e9)', borderTop: '1px solid var(--border, #cfe8c4)', borderBottom: '1px solid var(--border, #cfe8c4)' }}>
      <div className="container" style={{ padding: '18px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--g1, #1a5c1a)',
            whiteSpace: 'nowrap',
          }}
        >
          🌱 Cotação do dia
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, flex: 1 }}>
          {cotacoes.slice(0, 4).map((c) => (
            <div key={c.produto_id} style={{ fontSize: 13 }}>
              <strong style={{ color: 'var(--text, #1c1c1c)' }}>{c.produto_nome}</strong>{' '}
              <span style={{ color: 'var(--g2, #2e8b2e)', fontWeight: 800 }}>{formatarBRL(c.preco_cooperado)}</span>
              <span style={{ color: 'var(--muted, #555)' }}> /{c.unidade}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted, #555)', whiteSpace: 'nowrap' }}>
          atualizado {formatarDataCurta(cotacoes[0].vigente_a_partir_de)}
        </span>
      </div>
    </div>
  )
}
