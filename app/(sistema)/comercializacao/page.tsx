import { temAlgumaFuncao } from '@/lib/permissoes'
import { getUsuarioLogado } from '@/lib/auth'
import Link from 'next/link'

export default async function ComercializacaoPage() {
  const usuario = await getUsuarioLogado()

  const cards = [
    {
      href: '/comercializacao/produtos',
      titulo: 'Produtos',
      descricao: 'Catálogo de produtos recebidos',
      funcoes: ['admin'],
    },
    {
      href: '/comercializacao/cotacoes',
      titulo: 'Cotações',
      descricao: 'Preços diários por produto',
      funcoes: ['admin', 'financeiro'],
    },
    {
      href: '/comercializacao/produtores',
      titulo: 'Produtores',
      descricao: 'Cadastro e fichas',
      funcoes: ['admin', 'caixa_cacau', 'tecnico'],
    },
    {
      href: '/comercializacao/caixa',
      titulo: 'Caixa',
      descricao: 'Recebimento e pagamentos',
      funcoes: ['admin', 'caixa_cacau'],
    },
    {
      href: '/comercializacao/safras',
      titulo: 'Safras',
      descricao: 'Períodos de produção',
      funcoes: ['admin', 'financeiro'],
    },
    {
      href: '/comercializacao/lotes',
      titulo: 'Lotes',
      descricao: 'Formação de lotes',
      funcoes: ['admin', 'financeiro', 'tecnico'],
    },
    {
      href: '/comercializacao/compradores',
      titulo: 'Compradores',
      descricao: 'Moageiras, exportadores',
      funcoes: ['admin', 'financeiro'],
    },
    {
      href: '/comercializacao/vendas',
      titulo: 'Vendas externas',
      descricao: 'Negociações com compradores',
      funcoes: ['admin', 'financeiro'],
    },
    {
      href: '/comercializacao/retiradas',
      titulo: 'Retiradas',
      descricao: 'Saídas físicas do galpão',
      funcoes: ['admin', 'financeiro'],
    },
    {
      href: '/comercializacao/distribuicao',
      titulo: 'Distribuição',
      descricao: 'Rateio do resultado',
      funcoes: ['admin', 'financeiro'],
    },
  ]

  const cardsVisiveis = cards.filter(c =>
    temAlgumaFuncao(usuario, c.funcoes)
  )

  return (
    <div style={{ padding: '32px', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0, color: '#1a1a1a' }}>
          Comercialização
        </h1>
        <p style={{ marginTop: '4px', color: '#6b6b6b', fontSize: '14px' }}>
          Gestão completa do ciclo de comercialização
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {cardsVisiveis.map(card => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff',
              border: '1px solid #e5e3dc',
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s',
              borderTop: '3px solid #92400e'
            }}>
              <div style={{ fontWeight: 500, fontSize: '15px', color: '#1a1a1a', marginBottom: '6px' }}>
                {card.titulo}
              </div>
              <div style={{ fontSize: '13px', color: '#6b6b6b' }}>
                {card.descricao}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
