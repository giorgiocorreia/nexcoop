'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const VERDE = '#1D9E75'

type Aba = 'pdv' | 'pedidos' | 'estoque' | 'compras' | 'cadastros' | 'caixa'

const ABAS: { id: Aba; label: string; icone: string }[] = [
  { id: 'pdv',      label: 'PDV',            icone: '🛒' },
  { id: 'pedidos',  label: 'Pedidos Online',  icone: '📦' },
  { id: 'estoque',  label: 'Estoque',         icone: '📊' },
  { id: 'compras',  label: 'Compras',         icone: '🧾' },
  { id: 'cadastros',label: 'Cadastros',       icone: '📋' },
  { id: 'caixa',    label: 'Relatórios & Gestão', icone: '📊' },
]

interface ModuloCard {
  titulo:     string
  descricao:  string
  icone:      string
  href:       string
  contagem?:  number
  badge?:     { texto: string; cor: string; bg: string } | null
  emBreve?:   boolean
}

interface Props {
  totalProdutos:     number
  totalFornecedores: number
  estoqueBaixo:      number
}

function CardModulo({ card, onClick }: { card: ModuloCard; onClick?: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={card.emBreve ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', border: `1px solid ${hov && !card.emBreve ? VERDE : '#e5e3dc'}`,
        borderRadius: '12px', padding: '1.25rem',
        cursor: card.emBreve ? 'default' : 'pointer',
        opacity: card.emBreve ? 0.6 : 1,
        transition: 'border-color 0.15s',
        position: 'relative',
      }}
    >
      {card.emBreve && (
        <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', background: '#f0eeea', color: '#888', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
          EM BREVE
        </span>
      )}
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>{card.icone}</div>
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
        {card.titulo}
        {card.contagem != null && (
          <span style={{ marginLeft: '6px', fontSize: '12px', color: '#888', fontWeight: '400' }}>
            ({card.contagem})
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>
        {card.descricao}
      </div>
      {card.badge && (
        <div style={{ marginTop: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: card.badge.bg, color: card.badge.cor }}>
            {card.badge.texto}
          </span>
        </div>
      )}
    </div>
  )
}

function AbaVazia({ label, icone }: { label: string; icone: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icone}</div>
      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#aaa' }}>Este módulo está em desenvolvimento.</div>
    </div>
  )
}

export default function LojaHub({ totalProdutos, totalFornecedores, estoqueBaixo }: Props) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('cadastros')
  const router = useRouter()

  const cadastrosCards: ModuloCard[] = [
    {
      titulo:    'Produtos',
      descricao: 'Gerencie o catálogo de produtos com preços e estoque.',
      icone:     '🌿',
      href:      '/loja/produtos',
      contagem:  totalProdutos,
      badge: estoqueBaixo > 0
        ? { texto: `${estoqueBaixo} com estoque baixo`, cor: '#dc2626', bg: '#fef2f2' }
        : null,
    },
    {
      titulo:    'Fornecedores',
      descricao: 'Cadastre e gerencie os fornecedores da loja.',
      icone:     '🚚',
      href:      '/loja/fornecedores',
      contagem:  totalFornecedores,
      badge:     null,
    },
    {
      titulo:    'Clientes',
      descricao: 'Cadastro de clientes externos e cooperados.',
      icone:     '👤',
      href:      '/loja/clientes',
      emBreve:   true,
      badge:     null,
    },
  ]

  return (
    <div style={{ maxWidth: '1100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
          <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>NexCoop</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <Link href="/loja" style={{ color: '#6b7280', textDecoration: 'none' }}>Loja</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#1a1a1a' }}>Gerenciamento de produtos, estoque e vendas</span>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e3dc', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {ABAS.map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', background: 'none', border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap',
              fontSize: '13px', fontWeight: abaAtiva === aba.id ? '600' : '400',
              color: abaAtiva === aba.id ? VERDE : '#666',
              borderBottom: abaAtiva === aba.id ? `2px solid ${VERDE}` : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            <span style={{ fontSize: '14px' }}>{aba.icone}</span>
            {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo por aba */}

      {abaAtiva === 'cadastros' && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem', marginTop: 0 }}>
            Módulos de Cadastro
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {cadastrosCards.map(card => (
              <CardModulo
                key={card.titulo}
                card={card}
                onClick={() => router.push(card.href)}
              />
            ))}
          </div>
        </div>
      )}

      {abaAtiva === 'pdv' && (
        <AbaVazia label="Ponto de Venda (PDV)" icone="🛒" />
      )}
      {abaAtiva === 'pedidos' && (
        <AbaVazia label="Pedidos Online" icone="📦" />
      )}
      {abaAtiva === 'estoque' && (
        <AbaVazia label="Controle de Estoque" icone="📊" />
      )}
      {abaAtiva === 'compras' && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem', marginTop: 0 }}>
            Módulos de Compras e Fiscal
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {([
              {
                titulo:    'Nova Compra',
                descricao: 'Registre entradas de mercadorias de fornecedores.',
                icone:     '🛒',
                href:      '/loja/compras/nova',
              },
              {
                titulo:    'Histórico de Compras',
                descricao: 'Consulte todas as compras realizadas e seus lotes.',
                icone:     '📋',
                href:      '/loja/compras',
              },
              {
                titulo:    'Entradas NF-e',
                descricao: 'Vincule chaves de acesso da SEFAZ às compras registradas.',
                icone:     '📄',
                href:      '/loja/entradas',
              },
            ] as ModuloCard[]).map(card => (
              <CardModulo key={card.titulo} card={card} onClick={() => router.push(card.href)} />
            ))}
          </div>
        </div>
      )}
      {abaAtiva === 'caixa' && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem', marginTop: 0 }}>
            Relatórios & Gestão
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {([
              {
                titulo:    'Rel. Vendas',
                descricao: 'Histórico e totais de vendas por período e operador.',
                icone:     '📈',
                href:      '/loja/relatorio/vendas',
              },
              {
                titulo:    'Rel. Estoque',
                descricao: 'Posição atual, movimentações e histórico de ajustes.',
                icone:     '📦',
                href:      '/loja/relatorio/estoque',
              },
              {
                titulo:    'Rel. Caixa',
                descricao: 'Faturamento, sangrias e fechamentos por sessão.',
                icone:     '💵',
                href:      '/loja/relatorio/caixa',
              },
              {
                titulo:    'Conferência de Caixa',
                descricao: 'Confira e aprove os fechamentos dos operadores.',
                icone:     '✅',
                href:      '/loja/conferencia',
              },
              {
                titulo:    'Caixas',
                descricao: 'Sessões abertas e fechadas, forçar fechamento (admin).',
                icone:     '🗂️',
                href:      '/loja/caixas',
              },
            ] as ModuloCard[]).map(card => (
              <CardModulo key={card.titulo} card={card} onClick={() => router.push(card.href)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
