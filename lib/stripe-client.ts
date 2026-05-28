import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não configurada')
    stripePromise = loadStripe(key)
  }
  return stripePromise
}