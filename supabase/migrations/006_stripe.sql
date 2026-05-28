-- ============================================================
-- NextCoop — Stripe subscription fields on organizacoes
-- ============================================================

alter table organizacoes
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id        text,
  add column if not exists subscription_status    text,
  add column if not exists trial_ends_at          timestamptz,
  add column if not exists subscription_ends_at   timestamptz,
  add column if not exists plano                  text not null default 'gratuito';

-- Index para lookups por customer/subscription vindos do webhook
create index if not exists idx_organizacoes_stripe_customer
  on organizacoes (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists idx_organizacoes_stripe_subscription
  on organizacoes (stripe_subscription_id)
  where stripe_subscription_id is not null;