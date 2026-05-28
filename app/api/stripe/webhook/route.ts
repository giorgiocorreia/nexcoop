import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripeServer } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StatusAssinatura } from '@/types/database'

function toSubscriptionStatus(status: Stripe.Subscription.Status): StatusAssinatura | null {
  const map: Partial<Record<Stripe.Subscription.Status, StatusAssinatura>> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
  }
  return map[status] ?? null
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET não configurado')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 })
  }

  if (!sig) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })
  }

  const stripe = getStripeServer()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Assinatura inválida'
    console.error('[webhook] Falha na validação:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription' || !session.subscription) break

        const orgId = session.metadata?.organizacao_id
        if (!orgId) break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const mappedStatus = toSubscriptionStatus(subscription.status)

        await admin.from('organizacoes').update({
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0].price.id,
          subscription_status: mappedStatus,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        }).eq('id', orgId)

        console.log('[webhook] checkout.session.completed → org', orgId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.organizacao_id
        if (!orgId) break

        const mappedStatus = toSubscriptionStatus(subscription.status)

        await admin.from('organizacoes').update({
          stripe_price_id: subscription.items.data[0].price.id,
          subscription_status: mappedStatus,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        }).eq('id', orgId)

        console.log('[webhook] subscription.updated → org', orgId, 'status', subscription.status)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.organizacao_id
        if (!orgId) break

        await admin.from('organizacoes').update({
          subscription_status: 'canceled' as StatusAssinatura,
          subscription_ends_at: new Date().toISOString(),
        }).eq('id', orgId)

        console.log('[webhook] subscription.deleted → org', orgId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionRef = invoice.parent?.subscription_details?.subscription
        if (!subscriptionRef) break

        const subscriptionId =
          typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const orgId = subscription.metadata?.organizacao_id
        if (!orgId) break

        await admin.from('organizacoes').update({
          subscription_status: 'past_due' as StatusAssinatura,
        }).eq('id', orgId)

        console.log('[webhook] invoice.payment_failed → org', orgId)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[webhook] Erro ao processar evento', event.type, err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}