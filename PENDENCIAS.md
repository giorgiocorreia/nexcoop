# Pendências — NexCoop

Lista de tarefas pendentes. Marque com `[x]` ao concluir.

---

## 🔐 Infraestrutura

- [ ] Resetar chaves do Supabase (anon key e service_role key) e atualizar `.env.local` e Vercel

## 🎨 UI / Design

- [x] Redesign visual completo — kit `components/nexcoop/ui` em todos os módulos (jul/2026)
  - Dashboard, Cooperados, Financeiro, Mensalidades, Assembleias, Documentos
  - Comercialização (22+ telas)
  - Captação, Loja, Contábil, Configurações, Escritório, Perfil, Admin

## 🧩 Funcionalidades

- [x] Criar módulo de Documentos (lista + upload + gestão)
- [x] Classificação automática na escrituração (migration 061)
- [x] Integração financeiro: mensalidades, cotas, loja (compras + cancelamento venda)
- [x] Cadastro de cônjuge em produtor/cooperado + NF-e em nome do cônjuge (migration 060)

## 🗄️ Dados

- [x] Cadastrar organização COOPAIBI e usuário admin no banco — seed em `supabase/seeds/001_coopaibi.sql`

## 🌐 Deploy

- [ ] Configurar domínio personalizado no Vercel (nexcoop.com.br já ativo)
- [ ] Testar todos os módulos em produção após redesign

## 📋 Bloqueado — aguardando contador (Marcos/Contabahia)

- CSC ID e CSC Token NFC-e
- NCMs dos produtos da loja
- Regime tributário confirmado
- CSTs ICMS/PIS/COFINS
- Emissão real NF-e/NFC-e via Focus NFe

---

> Atualizado em: 2026-07-04