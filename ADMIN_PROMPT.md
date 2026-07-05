Implemente o módulo Admin do NexCoop.

## Contexto
- Stack: Next.js 14 + TypeScript + Supabase + inline styles (sem Tailwind classes)
- Rota: /admin (acessível apenas para role = 'super_admin')
- Multi-tenant: tabelas organizacoes, usuarios, cooperados

## O que construir

### 1. Guard de acesso
- Verificar role = 'super_admin' no layout
- Redirecionar para /dashboard se não for super_admin

### 2. /admin — Dashboard administrativo
Cards de resumo:
- Total de organizações ativas
- Total de usuários no sistema
- Total de cooperados (todas as orgs)
- Distribuição de planos

Lista de organizações com:
- Nome, tipo (cooperativa/associação), cidade/estado
- Plano atual (essencial/cooperativa/agro/impacto/enterprise)
- Nº de cooperados
- Data de criação
- Link para detalhes

### 3. /admin/organizacoes/[id] — Detalhe da organização
- Dados completos da organização
- Lista de usuários vinculados com roles
- Estatísticas: cooperados, mensalidades, documentos
- Ação: alterar plano
- Ação: ativar/desativar organização

### 4. /admin/organizacoes/nova — Criar organização + primeiro usuário admin
Formulário:
- Nome, nome_curto, CNPJ
- Tipo: cooperativa | associacao | central
- Plano inicial
- Cidade, estado, email, telefone

Ao salvar, criar também o primeiro usuário:
- nome_completo, email, senha temporária
- role = 'org_admin'
- vincular à organização

## Padrões obrigatórios do projeto
- UI kit: `import { PageLayout, COM_C, MODULO_NEXCOOP } from '@/components/nexcoop/ui'`
- Inline styles em TODOS os componentes (não usar classes Tailwind)
- Cores: `COM_C` — roxo `#635BFF`, verde `#16A34A`, txt `#1C1917`, bg `#FBF8F4`, borda `#E5E3DC`
- Server components onde possível, 'use client' apenas onde necessário
- Supabase: @/lib/supabase/server (server) e @/lib/supabase/client (client)
- Tipos em @/types/database
- Referência visual: `app/(sistema)/dashboard/DashboardClient.tsx`, `FinanceiroLista.tsx`

## CRÍTICO — Evitar erros conhecidos
- NÃO usar auth_org_id() — função não existe no banco
- NÃO usar set_atualizado_em() sem antes criá-la na migration
- RLS para super_admin: usar subquery em usuarios onde role = 'super_admin' e id = auth.uid()
- A migration SQL deve ser AUTOCONTIDA: incluir CREATE OR REPLACE FUNCTION para qualquer função usada
- Usar padrão RLS já existente no projeto:
  organizacao_id = (select organizacao_id from usuarios where id = auth.uid())

## Ao finalizar
- Listar todos os arquivos criados
- Fornecer o SQL completo e autocontido para rodar no Supabase
- Fazer push para main-local
