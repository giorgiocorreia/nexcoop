# Plano de Migração: Multi-Org (usuário em várias organizações)

**Status:** Não iniciado — documento de referência  
**Criado em:** 27/06/2026  
**Próxima migration disponível ao iniciar:** verificar `docs/SCHEMA.md` (era 056 em 27/06/2026)

---

## Motivação

Hoje cada usuário pertence a exatamente uma organização (`usuarios.organizacao_id`). Para suportar casos como:
- Contador que atende múltiplas cooperativas
- Diretor que integra cooperativa singular e central
- Super admin que precisa impersonar sem cookie especial

...precisamos de uma tabela de vínculo `usuario_organizacoes` e um conceito de "org ativa na sessão".

---

## Decisão de Arquitetura: Onde Fica a "Org Ativa"

> Este é o ponto mais crítico do plano. Precisa estar resolvido antes de escrever uma linha de código.

### Opção A — Cookie por sessão (RECOMENDADA)

```
Cookie: nexcoop_org_ativa=<organizacao_id>
Validade: sessão do browser
```

- Cada aba/browser tem sua própria org ativa independente
- `middleware.ts` lê o cookie e injeta no contexto
- `trocarOrgAtiva` server action reescreve o cookie
- **Sem estado no banco** para a "org ativa"

**Por que é melhor:** dois browsers do mesmo usuário não se interferem.

### Opção B — Campo `ativo` em `usuario_organizacoes` (DESCARTAR)

Marcar uma linha como `ativo = true` no banco. Problema: dois browsers do mesmo usuário trocam a org um do outro. Não usar.

### Decisão: Opção A (cookie)

O campo `org_ativa` existe na tabela apenas como "último acesso" (informativo), não como fonte de verdade da sessão.

---

## Schema: Tabela `usuario_organizacoes`

```sql
-- Migration 0XX_usuario_organizacoes.sql
CREATE TABLE usuario_organizacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  organizacao_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'cooperado',
  funcoes         text[] NOT NULL DEFAULT '{}',
  vinculo         text,                        -- 'cooperado' | 'funcionario' | 'diretoria' | 'externo'
  ativo           boolean NOT NULL DEFAULT true,
  convidado_em    timestamptz DEFAULT now(),
  aceito_em       timestamptz,
  ultimo_acesso   timestamptz,                 -- informativo, não é a "org ativa"
  created_at      timestamptz DEFAULT now(),
  UNIQUE(usuario_id, organizacao_id)
);

ALTER TABLE usuario_organizacoes ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas seus próprios vínculos
CREATE POLICY "usuario_ve_proprios_vinculos" ON usuario_organizacoes
  FOR SELECT USING (usuario_id = auth.uid());

-- Admin da org vê vínculos da sua org
CREATE POLICY "admin_ve_vinculos_org" ON usuario_organizacoes
  FOR SELECT USING (
    organizacao_id IN (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Populate inicial: espelhar usuarios.organizacao_id
INSERT INTO usuario_organizacoes (usuario_id, organizacao_id, role, funcoes, vinculo, ativo, aceito_em)
SELECT
  u.id,
  u.organizacao_id,
  u.role,
  COALESCE(u.funcoes, '{}'),
  'funcionario',
  true,
  now()
FROM usuarios u
WHERE u.organizacao_id IS NOT NULL
ON CONFLICT (usuario_id, organizacao_id) DO NOTHING;

-- Verificação: count deve ser igual
-- SELECT COUNT(*) FROM usuario_organizacoes;
-- SELECT COUNT(*) FROM usuarios WHERE organizacao_id IS NOT NULL;
```

---

## Nova `getUsuarioLogado()`

Arquivo: `lib/auth/get-usuario-logado.ts` (substitui a função atual em `lib/auth.ts`)

```typescript
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface UsuarioLogado {
  id: string
  email: string | null
  nome_completo: string
  role: string
  funcoes: string[]
  organizacao_id: string          // org ativa na sessão
  organizacoes: OrgVinculo[]      // todas as orgs do usuário
}

export interface OrgVinculo {
  organizacao_id: string
  nome: string
  tipo: string
  role: string
  funcoes: string[]
}

export async function getUsuarioLogado(): Promise<UsuarioLogado> {
  const authClient = await createClient()
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user) throw new Error('Não autenticado')

  const admin = createAdminClient()
  const cookieStore = await cookies()
  const orgAtivaCookie = cookieStore.get('nexcoop_org_ativa')?.value

  // Busca todos os vínculos do usuário
  const { data: vinculos } = await admin
    .from('usuario_organizacoes')
    .select('organizacao_id, role, funcoes, organizacoes(nome, tipo)')
    .eq('usuario_id', user.id)
    .eq('ativo', true)

  // Busca dados base do usuário
  const { data: usuario } = await admin
    .from('usuarios')
    .select('nome_completo, email, role, funcoes, organizacao_id')
    .eq('id', user.id)
    .single()

  if (!usuario) throw new Error('Usuário não encontrado')

  const orgs: OrgVinculo[] = (vinculos ?? []).map((v: any) => ({
    organizacao_id: v.organizacao_id,
    nome: v.organizacoes?.nome ?? '',
    tipo: v.organizacoes?.tipo ?? 'cooperativa',
    role: v.role,
    funcoes: v.funcoes ?? [],
  }))

  // Determina org ativa: cookie > legado (organizacao_id) > primeira da lista
  let orgAtiva = orgAtivaCookie ?? usuario.organizacao_id ?? orgs[0]?.organizacao_id
  if (orgAtiva && !orgs.find(o => o.organizacao_id === orgAtiva)) {
    // Cookie aponta para org sem vínculo ativo — usa a primeira disponível
    orgAtiva = orgs[0]?.organizacao_id
  }

  if (!orgAtiva) throw new Error('Usuário sem organização vinculada')

  const vinculoAtivo = orgs.find(o => o.organizacao_id === orgAtiva)

  return {
    id: user.id,
    email: usuario.email,
    nome_completo: usuario.nome_completo,
    role: vinculoAtivo?.role ?? usuario.role,
    funcoes: vinculoAtivo?.funcoes ?? (usuario.funcoes as string[] ?? []),
    organizacao_id: orgAtiva,
    organizacoes: orgs,
  }
}
```

---

## Server Action: `trocarOrgAtiva`

```typescript
// lib/auth/trocar-org-ativa.ts
'use server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function trocarOrgAtiva(novaOrgId: string): Promise<{ ok: boolean; erro?: string }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado' }

  // Verifica se o usuário realmente tem vínculo com essa org
  const admin = createAdminClient()
  const { data: vinculo } = await admin
    .from('usuario_organizacoes')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('organizacao_id', novaOrgId)
    .eq('ativo', true)
    .single()

  if (!vinculo) return { ok: false, erro: 'Sem acesso a essa organização' }

  // Registra último acesso (informativo)
  await admin
    .from('usuario_organizacoes')
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq('usuario_id', user.id)
    .eq('organizacao_id', novaOrgId)

  const cookieStore = await cookies()
  cookieStore.set('nexcoop_org_ativa', novaOrgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })

  revalidatePath('/', 'layout')
  return { ok: true }
}
```

---

## RLS Durante a Transição (Sessões 2-5)

Durante a migração, as RLS precisam aceitar as duas formas (antiga e nova) para não quebrar produção enquanto o código ainda não foi 100% migrado:

```sql
-- Padrão de transição: UNION das duas fontes
-- Substituir APÓS a migração completa pela versão final abaixo

-- VERSÃO TRANSIÇÃO (sessões 2-5):
USING (
  organizacao_id IN (
    -- Fonte nova: usuario_organizacoes
    SELECT uo.organizacao_id
    FROM usuario_organizacoes uo
    WHERE uo.usuario_id = auth.uid() AND uo.ativo = true
    UNION
    -- Fonte legada: usuarios.organizacao_id (paraquedas)
    SELECT u.organizacao_id
    FROM usuarios u
    WHERE u.id = auth.uid() AND u.organizacao_id IS NOT NULL
  )
)

-- VERSÃO FINAL (sessão 6, após remover coluna):
USING (
  organizacao_id IN (
    SELECT organizacao_id FROM usuario_organizacoes
    WHERE usuario_id = auth.uid() AND ativo = true
  )
)
```

---

## Componente OrgSwitcher (Sidebar)

```tsx
// components/OrgSwitcher.tsx
'use client'
import { useState, useTransition } from 'react'
import { trocarOrgAtiva } from '@/lib/auth/trocar-org-ativa'

interface OrgVinculo {
  organizacao_id: string
  nome: string
  tipo: string
}

interface Props {
  orgAtual: OrgVinculo
  todasOrgs: OrgVinculo[]
}

export function OrgSwitcher({ orgAtual, todasOrgs }: Props) {
  const [aberto, setAberto] = useState(false)
  const [pending, startTransition] = useTransition()

  if (todasOrgs.length <= 1) return null // Usuário com 1 org não precisa do switcher

  function trocar(orgId: string) {
    setAberto(false)
    startTransition(async () => {
      await trocarOrgAtiva(orgId)
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setAberto(v => !v)} disabled={pending}>
        {orgAtual.nome} ▾
      </button>
      {aberto && (
        <ul>
          {todasOrgs.map(org => (
            <li key={org.organizacao_id}>
              <button
                onClick={() => trocar(org.organizacao_id)}
                style={{ fontWeight: org.organizacao_id === orgAtual.organizacao_id ? 700 : 400 }}
              >
                {org.nome}
                <span>{org.tipo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## Server Action: `convidarUsuarioOrg`

```typescript
// lib/auth/convidar-usuario-org.ts
'use server'

export async function convidarUsuarioOrg(params: {
  email: string
  organizacao_id: string
  role: string
  funcoes: string[]
}): Promise<{ ok: boolean; erro?: string }> {
  // Fase 5: só para usuários que já têm conta
  // Fase 6 futura: disparar email de convite para novos usuários

  const admin = createAdminClient()
  const usuario = await getUsuarioLogado()

  // Verificar se quem convida é admin da org
  const vinculoConvitante = usuario.organizacoes.find(
    o => o.organizacao_id === params.organizacao_id
  )
  if (!vinculoConvitante?.funcoes.includes('admin')) {
    return { ok: false, erro: 'Sem permissão para convidar nessa organização' }
  }

  // Buscar o usuário pelo email
  const { data: usuarioConvidado } = await admin
    .from('usuarios')
    .select('id')
    .eq('email', params.email)
    .single()

  if (!usuarioConvidado) {
    return { ok: false, erro: 'Usuário não encontrado. Apenas usuários com conta ativa podem ser convidados nesta fase.' }
  }

  // Inserir vínculo
  const { error } = await admin
    .from('usuario_organizacoes')
    .insert({
      usuario_id: usuarioConvidado.id,
      organizacao_id: params.organizacao_id,
      role: params.role,
      funcoes: params.funcoes,
      ativo: true,
      aceito_em: new Date().toISOString(), // auto-aceito nesta fase
    })

  if (error?.code === '23505') {
    return { ok: false, erro: 'Usuário já tem vínculo com essa organização.' }
  }
  if (error) return { ok: false, erro: error.message }

  return { ok: true }
}
```

---

## Roteiro por Sessão

### Sessão 1 — Schema
- [ ] Verificar número correto da próxima migration em `docs/SCHEMA.md`
- [ ] Rodar `0XX_usuario_organizacoes.sql` no Supabase Dashboard SQL Editor
- [ ] Verificar: `COUNT(usuario_organizacoes) == COUNT(usuarios WHERE organizacao_id IS NOT NULL)`
- [ ] Adicionar tipo `UsuarioOrganizacoes` em `types/database.ts`
- [ ] Commit: `feat: migration 0XX - tabela usuario_organizacoes`

### Sessão 2 — Nova `getUsuarioLogado` + RLS de transição
- [ ] Criar `lib/auth/get-usuario-logado.ts` (nova implementação com cookie)
- [ ] Atualizar `middleware.ts` para ler `nexcoop_org_ativa`
- [ ] Aplicar RLS de transição (UNION) nas tabelas críticas:
  - `cooperados`, `movimentacoes_conta`, `lancamentos`, `organizacoes`
- [ ] `npx tsc --noEmit` — zero erros
- [ ] Testar: COOPAIBI deve funcionar normalmente (coluna legada ainda ativa)
- [ ] Commit: `feat: nova getUsuarioLogado + RLS transição multi-org`

### Sessão 3 — OrgSwitcher
- [ ] Implementar `components/OrgSwitcher.tsx`
- [ ] Criar `lib/auth/trocar-org-ativa.ts`
- [ ] Adicionar OrgSwitcher na Sidebar (só aparece se `todasOrgs.length > 1`)
- [ ] Criar usuário de teste com 2 vínculos via SQL direto:
  ```sql
  INSERT INTO usuario_organizacoes (usuario_id, organizacao_id, role, funcoes, ativo, aceito_em)
  VALUES ('<uid>', '<segunda_org_id>', 'org_admin', '{admin}', true, now());
  ```
- [ ] Testar troca de org e verificar que dados mudam corretamente
- [ ] Commit: `feat: org switcher + server action trocarOrgAtiva`

### Sessão 4 — Migração de arquivos (lote 1: Comercialização)
```bash
# Rodar antes de começar:
grep -rl "from usuarios where id = auth.uid()" ./app ./lib ./components | sort > arquivos_para_migrar.txt
grep -rl "getUsuarioLogado" ./app ./lib ./components | sort >> arquivos_para_migrar.txt
sort -u arquivos_para_migrar.txt -o arquivos_para_migrar.txt
wc -l arquivos_para_migrar.txt
```
- [ ] Migrar módulo `lib/comercializacao/` e `app/(sistema)/comercializacao/`
- [ ] `npx tsc --noEmit` após cada batch
- [ ] Commit: `refactor: migração multi-org - módulo comercializacao`

### Sessão 5 — Migração de arquivos (lote 2: restantes) + convite
- [ ] Migrar `lib/cooperados/`, `lib/financeiro/`, `lib/loja/`, `app/(sistema)/cooperados/`, etc.
- [ ] Implementar `convidarUsuarioOrg`
- [ ] RLS final: remover UNION, usar apenas `usuario_organizacoes`
- [ ] `npx tsc --noEmit` — zero erros
- [ ] Commit: `refactor: migração multi-org - server actions + RLS final`

### Sessão 6 — Limpeza (só após 24h+ de validação em produção)
- [ ] Validar COOPAIBI em produção por pelo menos 24h após Sessão 5
- [ ] Rodar no Supabase Dashboard SQL Editor:
  ```sql
  -- OPERAÇÃO IRREVERSÍVEL — só executar após validação completa
  ALTER TABLE usuarios DROP COLUMN organizacao_id;

  -- Verificação: deve retornar 0 rows
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'usuarios' AND column_name = 'organizacao_id';
  ```
- [ ] Remover imports e referências à coluna legada no código
- [ ] `npx tsc --noEmit` — zero erros
- [ ] Commit: `feat: migração multi-org concluída - remove organizacao_id de usuarios`
- [ ] Atualizar `CONTEXTO_NEXCOOP.md`, `CHANGELOG.md`, `docs/SCHEMA.md`, `docs/ARQUITETURA.md`, `docs/MODULOS.md`

---

## Regra de Ouro

> **Cada sessão termina com produção funcionando.**
>
> A coluna `usuarios.organizacao_id` é o paraquedas. Só é removida na Sessão 6, quando tudo estiver validado com COOPAIBI. Nunca fazer deploy de estado intermediário que quebre o cliente piloto.

---

## Pontos de Atenção

1. **Número da migration:** verificar `docs/SCHEMA.md` no momento de iniciar — era 056 em 27/06/2026 mas pode ter mudado.

2. **`active org` = cookie, não banco:** o campo `ultimo_acesso` em `usuario_organizacoes` é apenas informativo. A org ativa da sessão vive no cookie `nexcoop_org_ativa`.

3. **Sessões 4 e 5 são as mais pesadas:** ~70 arquivos não cabe em uma sessão. Cada módulo deve ser um commit separado com TSC passando antes de continuar.

4. **Usuário de teste para Sessão 3:** precisará ser criado manualmente via SQL antes de começar a sessão — não tem UI de convite ainda.

5. **Performance da RLS com UNION:** durante as sessões 2-5 as queries serão ligeiramente mais lentas. Monitorar e confirmar que não impacta COOPAIBI antes de avançar para a sessão seguinte.
