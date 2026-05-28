import { NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { price_id } = body as { price_id: string }

  if (!price_id) {
    return NextResponse.json({ error: 'price_id obrigatório' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: usuario } = await admin
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  if (!usuario?.organizacao_id) {
    return NextResponse.json({ error: 'Usuário sem organização associada' }, { status: 400 })
  }

  const { data: org } = await admin
    .from('organizacoes')
    .select('id, nome, email, stripe_customer_id')
    .eq('id', usuario.organizacao_id)
    .single()

  if (!org) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const stripe = getStripeServer()

  let customerId = org.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.nome,
      email: org.email ?? user.email ?? undefined,
      metadata: { organizacao_id: org.id },
    })
    customerId = customer.id

    await admin
      .from('organizacoes')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id)
  }

  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: price_id, quantity: 1 }],
    success_url: `${origin}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/assinar/cancelado`,
    metadata: { organizacao_id: org.id },
    subscription_data: {
      metadata: { organizacao_id: org.id },
      trial_period_days: 14,
    },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}