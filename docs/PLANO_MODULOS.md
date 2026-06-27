# Plano: Sistema de Módulos com Cobrança por Módulo

**Status:** Não iniciado — documento de referência  
**Criado em:** 27/06/2026

---

## Estado Atual

O que já existe e funciona:
- `organizacoes.modulos_ativos: string[]` — coluna já no banco
- `temModulo(modulos_ativos, 'loja')` em `lib/org.ts` — função já existe
- Stripe integrado: `lib/stripe.ts`, planos em `lib/planos.ts`
- Sidebar já faz gate de `loja` com `temModulo()`

O que está errado ou incompleto:
- `criarOrganizacao()` não define `modulos_ativos` — toda org nasce sem módulo nenhum
- Apenas `loja` é guardado por módulo na Sidebar; todos os outros (comercialização, contábil, captação) são liberados por role, ignorando `modulos_ativos`
- Planos atuais são tiers planos (essencial/profissional/agro) — não cobram por módulo

---

## Catálogo de Módulos

```typescript
// lib/modulos.ts

export const MODULOS = {
  // ── Incluídos em todos os planos pagos ──────────────────────
  cooperados:    { nome: 'Cooperados / Filiados',   preco_mensal: 0    },
  financeiro:    { nome: 'Financeiro',               preco_mensal: 0    },
  assembleias:   { nome: 'Assembleias',              preco_mensal: 0    },
  documentos:    { nome: 'Documentos',               preco_mensal: 0    },
  mensalidades:  { nome: 'Mensalidades',             preco_mensal: 0    },

  // ── Módulos opcionais com cobrança adicional ─────────────────
  contabil:         { nome: 'Contabilidade',              preco_mensal: 299  },
  comercializacao:  { nome: 'Comercialização Agro',       preco_mensal: 499  },
  loja:             { nome: 'Loja / PDV',                 preco_mensal: 199  },
  captacao:         { nome: 'Captação de Projetos',       preco_mensal: 149  },
} as const

export type ModuloId = keyof typeof MODULOS
```

Obs: preços acima são referência. Ajustar antes de subir ao Stripe.

---

## Modelo de Cobrança

### Estrutura

**Base mensal** (cobre módulos incluídos, limite de filiados, suporte):

| Tier base | Filiados | Preço base |
|-----------|----------|------------|
| Gratuito  | até 10   | R$ 0       |
| Essencial | até 50   | R$ 149     |
| Profissional | até 200 | R$ 299  |
| Cooperativa  | ilimitado | R$ 499 |

**Add-ons mensais** (cobrados via Stripe Subscription Items adicionais):

| Módulo             | Preço mensal |
|--------------------|-------------|
| Contabilidade      | R$ 299      |
| Comercialização    | R$ 499      |
| Loja / PDV         | R$ 199      |
| Captação           | R$ 149      |

**Total da org** = base + soma dos add-ons ativados.

Exemplo: uma cooperativa no plano Profissional com Contabilidade e Comercialização paga R$ 299 + R$ 299 + R$ 499 = **R$ 1.097/mês**.

### Stripe: uma subscription, múltiplos items

```typescript
// Ao ativar módulo em org que já tem subscription:
await stripe.subscriptionItems.create({
  subscription: org.stripe_subscription_id,
  price: STRIPE_PRICE_IDS[moduloId],
  proration_behavior: 'always_invoice', // cobra proporcional imediato
})

// Ao desativar:
await stripe.subscriptionItems.del(itemId, {
  proration_behavior: 'always_invoice',
})
```

Isso exige uma coluna `stripe_item_ids: jsonb` em `organizacoes` para mapear `moduloId → stripe_subscription_item_id`.

---

## O Que Precisa Ser Construído

### 1. Migration: adicionar `stripe_item_ids` em `organizacoes`

```sql
-- Migration 0XX_org_stripe_items.sql
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS stripe_item_ids jsonb DEFAULT '{}';
```

Estrutura da coluna:
```json
{
  "contabil": "si_abc123",
  "comercializacao": "si_def456",
  "loja": "si_ghi789"
}
```

### 2. `lib/modulos.ts` — catálogo canônico

Fonte única de verdade para: IDs, nomes, preços, price IDs do Stripe, e módulos padrão por tipo de org.

```typescript
export const MODULOS_PADRAO_POR_TIPO: Record<string, ModuloId[]> = {
  cooperativa: ['cooperados', 'financeiro', 'assembleias', 'documentos', 'mensalidades'],
  associacao:  ['cooperados', 'financeiro', 'assembleias', 'documentos', 'mensalidades'],
  central:     ['cooperados', 'financeiro', 'assembleias', 'documentos', 'mensalidades', 'comercializacao'],
}

// Price IDs do Stripe por módulo (variáveis de ambiente)
export const STRIPE_PRICE_IDS: Partial<Record<ModuloId, string>> = {
  contabil:        process.env.STRIPE_PRICE_CONTABIL        ?? '',
  comercializacao: process.env.STRIPE_PRICE_COMERCIALIZACAO ?? '',
  loja:            process.env.STRIPE_PRICE_LOJA            ?? '',
  captacao:        process.env.STRIPE_PRICE_CAPTACAO        ?? '',
}
```

### 3. `criarOrganizacao()` define `modulos_ativos`

```typescript
// app/(sistema)/admin/organizacoes/nova/actions.ts

export interface CriarOrgInput {
  // ... campos existentes ...
  modulos_extras: ModuloId[]  // módulos além dos padrão do tipo
}

export async function criarOrganizacao(input: CriarOrgInput) {
  const modulosPadrao = MODULOS_PADRAO_POR_TIPO[input.tipo] ?? []
  const modulos_ativos = [...new Set([...modulosPadrao, ...input.modulos_extras])]

  await supabase.from('organizacoes').insert({
    // ... campos existentes ...
    modulos_ativos,
  })
}
```

### 4. Sidebar gatea todos os módulos opcionais

Hoje só `loja` é guardado. Completar com os demais:

```tsx
// components/Sidebar.tsx — buildNav()

// Comercialização: role + módulo
if ((isAdmin || isFinanceiro || isTecnico || isCaixaCacau)
    && temModulo(org?.modulos_ativos, 'comercializacao'))
  agroItens.push({ label: 'Comercialização', ... })

// Captação: role + módulo
if ((isAdmin || isCaptador) && temModulo(org?.modulos_ativos, 'captacao'))
  projetosItens.push({ label: 'Captação', ... })

// Contábil: role + módulo
if ((isAdmin || isContador) && temModulo(org?.modulos_ativos, 'contabil'))
  grupos.push({ grupo: 'Contábil', ... })
```

### 5. Middleware bloqueia rotas por módulo

```typescript
// middleware.ts — adicionar depois do check de autenticação

const ROTAS_POR_MODULO: Record<string, string> = {
  '/comercializacao': 'comercializacao',
  '/loja':            'loja',
  '/contabil':        'contabil',
  '/captacao':        'captacao',
}

for (const [prefixo, modulo] of Object.entries(ROTAS_POR_MODULO)) {
  if (pathname.startsWith(prefixo)) {
    const modulosAtivos = org?.modulos_ativos ?? []
    if (!modulosAtivos.includes(modulo)) {
      return NextResponse.redirect(new URL('/dashboard?modulo_inativo=true', req.url))
    }
  }
}
```

### 6. Server action `ativarModulo` / `desativarModulo`

```typescript
// lib/modulos/actions.ts
'use server'

export async function ativarModulo(orgId: string, moduloId: ModuloId) {
  // 1. Verificar se já está ativo
  // 2. Se org tem subscription Stripe: adicionar subscription item
  // 3. Atualizar modulos_ativos e stripe_item_ids no banco
  // 4. revalidatePath('/', 'layout')
}

export async function desativarModulo(orgId: string, moduloId: ModuloId) {
  // 1. Remover subscription item do Stripe
  // 2. Remover do modulos_ativos e stripe_item_ids
  // 3. revalidatePath('/', 'layout')
}
```

### 7. UI no admin: seleção de módulos ao criar org

No formulário `/admin/organizacoes/nova`, adicionar seção:

```
Módulos extras (além do padrão)
[ ] Contabilidade          + R$ 299/mês
[ ] Comercialização Agro   + R$ 499/mês
[ ] Loja / PDV             + R$ 199/mês
[ ] Captação de Projetos   + R$ 149/mês

Total estimado: R$ 448/mês (plano Essencial + Contabilidade)
```

### 8. UI no admin: gerenciar módulos de org existente

Em `/admin/organizacoes/[id]`, adicionar aba "Módulos":
- Lista todos os módulos com status (ativo / inativo)
- Botão "Ativar" / "Desativar" que chama a server action
- Exibe o impacto na cobrança antes de confirmar

---

## Fluxo de Cobrança (Stripe)

```
Org é criada (admin)
  └─> modulos_ativos definidos sem Stripe (isentas ou em trial)

Org assina plano base via /assinar
  └─> Stripe cria Subscription com o price do plano base
  └─> stripe_subscription_id salvo em organizacoes

Admin ativa módulo "Contabilidade" para a org
  └─> ativarModulo() chama stripe.subscriptionItems.create()
  └─> Stripe cobra proporcional no próximo ciclo
  └─> stripe_item_ids.contabil = 'si_xyz...' salvo
  └─> modulos_ativos = [...atual, 'contabil']

Admin desativa módulo
  └─> desativarModulo() chama stripe.subscriptionItems.del()
  └─> Crédito proporcional gerado pelo Stripe
  └─> stripe_item_ids.contabil removido
  └─> modulos_ativos = atual sem 'contabil'
```

**Organizações isentas** (`isento = true`): `ativarModulo` pula o Stripe e só atualiza `modulos_ativos`.

---

## Checklist de Implementação

### Fase 1 — Fundação (sem Stripe ainda)
- [ ] Criar `lib/modulos.ts` com catálogo, defaults por tipo e price IDs
- [ ] Migration: `ADD COLUMN stripe_item_ids jsonb DEFAULT '{}'`
- [ ] Atualizar `criarOrganizacao()` para definir `modulos_ativos` com defaults do tipo
- [ ] Sidebar: gate `comercializacao`, `contabil`, `captacao` por `temModulo()`
- [ ] Middleware: bloquear rotas sem módulo ativo
- [ ] Testar com COOPAIBI: ela deve ter `['cooperados','financeiro','assembleias','documentos','mensalidades','comercializacao']` depois da migration

### Fase 2 — UI Admin
- [ ] Formulário de nova org: campo de seleção de módulos com estimativa de preço
- [ ] Página de org existente: aba "Módulos" com ativar/desativar
- [ ] `ativarModulo()` e `desativarModulo()` sem Stripe (apenas DB)

### Fase 3 — Stripe (módulos com cobrança)
- [ ] Criar price IDs no Stripe Dashboard para cada módulo
- [ ] Adicionar variáveis de ambiente: `STRIPE_PRICE_CONTABIL`, `STRIPE_PRICE_LOJA`, etc.
- [ ] `ativarModulo()`: integrar `stripe.subscriptionItems.create()` para orgs com subscription
- [ ] `desativarModulo()`: integrar `stripe.subscriptionItems.del()`
- [ ] Webhook Stripe: sincronizar se item for removido fora do sistema (ex: chargeback)

---

## Pontos de Atenção

1. **Migração dos dados existentes:** COOPAIBI e qualquer outra org atual tem `modulos_ativos = []`. Precisará de um script de população uma vez só (Fase 1):
   ```sql
   UPDATE organizacoes
   SET modulos_ativos = ARRAY['cooperados','financeiro','assembleias',
                               'documentos','mensalidades','comercializacao']
   WHERE id = '3ad97dc2-f87f-4e67-950e-387854d5bccc'; -- COOPAIBI

   -- Para outras orgs: definir conforme o plano/tipo atual
   ```

2. **Orgs isentas:** `isento = true` já existe no schema. `ativarModulo` deve checar esse flag e pular o Stripe.

3. **Ordem das fases:** Fase 1 (gate na sidebar/middleware) deve vir antes de Fase 3 (Stripe). Não faz sentido cobrar por módulo se o acesso não está bloqueado.

4. **`contabil` vs contador externo:** O módulo `contabil` libera o acesso à contabilidade pelo admin da org. Contadores externos (escritório parceiro) têm acesso pelo vínculo em `profissionais_parceiros`, que é independente do módulo.

5. **Granularidade futura:** O catálogo pode crescer (ex: `nfe`, `relatorios_avancados`). O modelo suporta isso — basta adicionar em `MODULOS` e criar o price no Stripe.
