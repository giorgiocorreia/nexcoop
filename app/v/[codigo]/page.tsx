import type { Metadata } from 'next'
import { buscarCarteirinhaPorCodigo } from '@/lib/carteirinha/queries'
import { resolverStatusCarteirinha, mascararCpf } from '@/lib/carteirinha/carteirinha-utils'
import { corPrimariaOrg } from '@/lib/tema'
import { formatarDataCurta } from '@/lib/site/site-utils'

// Consulta AO VIVO a cada acesso — é a garantia de negócio da carteirinha
// (desligar o cooperado revoga o acesso instantaneamente). Nada aqui pode
// ser cacheado/prerenderizado.
export const dynamic = 'force-dynamic'

// Página não pode ser indexada pelo Google — é dado pessoal (mesmo que
// mascarado/mínimo) servido sem autenticação, exposto só pra quem tem o
// link/QR físico.
export const metadata: Metadata = {
  title: 'Verificação de carteirinha',
  robots: { index: false, follow: false },
}

// Rota GLOBAL fora do grupo (site-org) de propósito — ver comentário no
// middleware.ts. Layout próprio e enxuto, sem o chrome do sistema interno
// (root layout.tsx já é minimalista, então não precisamos de outro layout.tsx
// aqui).

function CarteirinhaNaoEncontrada() {
  // Mensagem neutra — nunca revela se o código já existiu algum dia
  // (revogado, expirado, nunca emitido: mesma tela pra todos).
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', padding: 24 }}>
      <div style={{ maxWidth: 380, width: '100%', background: '#fff', borderRadius: 16, padding: '32px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>🔍</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#18181b' }}>Carteirinha não encontrada</h1>
        <p style={{ fontSize: 14, color: '#71717a', lineHeight: 1.5 }}>
          O código informado não corresponde a nenhuma carteirinha válida. Confira o QR code ou o link utilizado.
        </p>
      </div>
    </div>
  )
}

export default async function VerificacaoCarteirinhaPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const carteirinha = await buscarCarteirinhaPorCodigo(codigo)

  if (!carteirinha) {
    return <CarteirinhaNaoEncontrada />
  }

  const status = resolverStatusCarteirinha(
    carteirinha.cooperado.status,
    carteirinha.validaAte,
    carteirinha.revogadaEm
  )
  const valida = status.situacao === 'valida'
  const cor = corPrimariaOrg({ tipo: carteirinha.organizacao.tipo, cor_primaria: carteirinha.organizacao.corPrimaria })
  const verificadoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  // Semáforo verde/vermelho — nunca só cor: ícone + texto grande garantem
  // leitura mesmo pra quem tem daltonismo ou vê a tela com brilho baixo ao
  // ar livre (é escaneado no celular, muitas vezes na rua).
  const corSemaforo = valida ? '#16a34a' : '#dc2626'
  const bgSemaforo = valida ? '#dcfce7' : '#fee2e2'
  const icone = valida ? '✓' : '✕'

  return (
    <div style={{ minHeight: '100dvh', background: '#f4f4f5', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        {/* Semáforo de status — primeira coisa vista, legível de relance */}
        <div
          role="status"
          style={{
            background: bgSemaforo,
            border: `2px solid ${corSemaforo}`,
            borderRadius: 16,
            padding: '20px 16px',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 36, color: corSemaforo, lineHeight: 1 }} aria-hidden>{icone}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: corSemaforo, marginTop: 6, letterSpacing: 0.5 }}>
            {status.rotulo}
          </div>
          {status.detalhe && (
            <div style={{ fontSize: 13, color: corSemaforo, marginTop: 4, fontWeight: 500 }}>
              {status.detalhe}
            </div>
          )}
        </div>

        {/* Cartão com os dados do filiado — o mínimo pra identificação visual,
            nunca dado financeiro/contato (ver regras da Fase 1). */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
          {/* Marca d'água: logo da org preenchendo o fundo do cartão. Opacidade
              baixa (0.06) pra não competir com o texto — a página é lida na
              hora da conferência, legibilidade vem antes da identidade visual.
              position/zIndex mantêm o conteúdo por cima; pointerEvents none pra
              não capturar toque no celular. */}
          {carteirinha.organizacao.logoUrl && (
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: 0, zIndex: 0, opacity: 0.06,
                backgroundImage: `url(${carteirinha.organizacao.logoUrl})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: '78%',
                pointerEvents: 'none',
              }}
            />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e4e4e7' }}>
            {carteirinha.organizacao.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={carteirinha.organizacao.logoUrl}
                alt={carteirinha.organizacao.nome}
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: cor, flexShrink: 0 }} aria-hidden />
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#18181b' }}>{carteirinha.organizacao.nome}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            {carteirinha.cooperado.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={carteirinha.cooperado.fotoUrl}
                alt={carteirinha.cooperado.nome}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${cor}` }}
              />
            ) : (
              <div
                style={{
                  width: 64, height: 64, borderRadius: '50%', background: cor, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0,
                }}
                aria-hidden
              >
                {carteirinha.cooperado.nome.trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#18181b' }}>{carteirinha.cooperado.nome}</div>
              {carteirinha.cooperado.numeroMatricula && (
                <div style={{ fontSize: 13, color: '#71717a' }}>Matrícula {carteirinha.cooperado.numeroMatricula}</div>
              )}
            </div>
          </div>

          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div>
              <dt style={{ color: '#a1a1aa', marginBottom: 2 }}>Filiado desde</dt>
              <dd style={{ color: '#3f3f46', fontWeight: 600 }}>
                {carteirinha.cooperado.dataAdmissao ? formatarDataCurta(carteirinha.cooperado.dataAdmissao) : '—'}
              </dd>
            </div>
            <div>
              <dt style={{ color: '#a1a1aa', marginBottom: 2 }}>CPF</dt>
              <dd style={{ color: '#3f3f46', fontWeight: 600 }}>{mascararCpf(carteirinha.cooperado.cpf)}</dd>
            </div>
          </dl>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#a1a1aa', marginTop: 16 }}>
          Verificado em {verificadoEm} · consulta ao vivo ao cadastro da organização
        </p>
      </div>
    </div>
  )
}
