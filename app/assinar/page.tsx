import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AssinarPlanos from './AssinarPlanos'

const GREEN = '#635BFF'
const GREEN_DARK = '#4840CC'
const TEXT = '#1a1a1a'
const BG = '#f8f7f4'
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"

export default async function AssinarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/assinar')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('organizacao_id, role')
    .eq('id', user.id)
    .single()

  const orgId = usuario?.organizacao_id ?? null

  const planos = [
    {
      key: 'gratuito',
      nome: 'Gratuito',
      preco: 'R$ 0',
      periodo: '/mês',
      limite: 'Até 10 filiados',
      features: [
        'Gestão de filiados',
        'Mensalidades',
        'Documentos',
        'Assembleias',
      ],
      destaque: false,
      priceId: null,
      gratuito: true,
    },
    {
      key: 'essencial',
      nome: 'Essencial',
      preco: 'R$ 149',
      periodo: '/mês',
      limite: 'Até 50 filiados',
      features: [
        'Gestão de filiados',
        'Mensalidades',
        'Documentos',
        'Suporte por e-mail',
      ],
      destaque: false,
      priceId: process.env.STRIPE_PRICE_ESSENCIAL ?? null,
      gratuito: false,
    },
    {
      key: 'profissional',
      nome: 'Profissional',
      preco: 'R$ 499',
      periodo: '/mês',
      limite: 'Até 200 filiados',
      features: [
        'Tudo do Essencial',
        'Assembleias',
        'Módulo financeiro',
        'Suporte prioritário',
      ],
      destaque: true,
      priceId: process.env.STRIPE_PRICE_PROFISSIONAL ?? null,
      gratuito: false,
    },
    {
      key: 'agro',
      nome: 'Agro',
      preco: 'R$ 1.500',
      periodo: '/mês',
      limite: 'Filiados ilimitados',
      features: [
        'Tudo do Profissional',
        'Projetos Agro',
        'API de integração',
        'Gerente de conta',
      ],
      destaque: false,
      priceId: process.env.STRIPE_PRICE_AGRO ?? null,
      gratuito: false,
    },
    {
      key: 'enterprise',
      nome: 'Enterprise',
      preco: 'Consulta',
      periodo: '',
      limite: 'Personalizado',
      features: [
        'Infraestrutura dedicada',
        'SLA garantido',
        'Integrações customizadas',
        'Suporte 24/7',
      ],
      destaque: false,
      priceId: null,
      gratuito: false,
    },
  ]

  return (
    <div style={{ fontFamily: FONT, color: TEXT, background: BG, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <img src="/images/logo-nexcoop-horizontal.png" alt="NexCoop" style={{ height: 36, width: 'auto', display: 'block', margin: '0 auto 1.5rem' }} />

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#e6f5f0',
            color: GREEN_DARK,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.5px',
            padding: '5px 14px',
            borderRadius: 20,
            marginBottom: 20,
            textTransform: 'uppercase',
          }}>
            14 dias grátis nos planos pagos · Sem cartão de crédito
          </div>

          <h1 style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-1px',
            color: TEXT,
            marginBottom: 12,
          }}>
            Escolha o plano ideal para sua cooperativa
          </h1>
          <p style={{ fontSize: 16, color: '#666', maxWidth: 520, margin: '0 auto' }}>
            Preços transparentes, sem surpresas. Cancele quando quiser.
          </p>
        </div>

        <AssinarPlanos planos={planos} orgId={orgId} />

        <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 40 }}>
          Pagamento seguro via Stripe · Planos pagos incluem 14 dias de avaliação gratuita
        </p>
      </div>
    </div>
  )
}