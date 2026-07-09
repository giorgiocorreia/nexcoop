# Pendências — NexCoop

Lista de tarefas. Marque com `[x]` ao concluir.

---

## 🔐 Infraestrutura (ação manual)

- [x] Resetar chaves do Supabase (anon + service_role) e atualizar `.env.local` e Vercel
- [x] Hotmail/Outlook DMARC (TXT `_dmarc` no Registro.br + DKIM Zoho)
- [x] Domínio nexcoop.com.br ativo na Vercel

## 🎨 UI / Design

- [x] Redesign visual completo — kit `components/nexcoop/ui` (jul/2026)

## 🧩 Funcionalidades — concluídas

- [x] Classificação automática escrituração (migration 061)
- [x] Integração financeiro: mensalidades, cotas, loja, comercialização
- [x] Cônjuge produtor/cooperado + NF-e (migration 060)
- [x] `status_nfe` em Nova Compra (loja)
- [x] Safra obrigatória em `iniciarLote`
- [x] Filtros por função nos relatórios loja (vendas + caixa — server-side)
- [x] FOCUSNFE_AMBIENTE por módulo (`FOCUSNFE_AMBIENTE_LOJA`, `FOCUSNFE_AMBIENTE_COMERCIALIZACAO`)
- [x] `acesso_fiscal` parceiro contábil (migration 062)
- [x] Mensalidades ocultas para associações/centrais no sidebar
- [x] Extrato conta corrente na loja (`/loja/conta-corrente`)
- [x] Relatório vendas PDF A4 (`/api/loja/relatorio/vendas/pdf`)
- [x] Portal do Filiado MVP (`/filiado`)
- [x] Tesouraria / transferências (`/financeiro/tesouraria`)
- [x] Módulo Resultado por Safra (`/comercializacao/resultado`)
- [x] WhatsApp webhook + agente Mariana (`/api/whatsapp/webhook`)
- [x] Fluxo conversão/saque no caixa cacau (`registrarConversaoESaque`)

## 🧩 Funcionalidades — pendentes

- [ ] Relatórios A4 PDF estoque e compras (vendas já feito)
- [ ] Extrato conta corrente cooperado — relatórios compras A4
- [ ] Separação completa tokens Focus por org (hoje por módulo)
- [ ] KPI comercialização: validar em produção com dados reais pós-redesign
- [ ] `saldo_kg` em `contas_produtor` (hoje via `saldos_produtor_snapshot`)
- [ ] Tela dedicada "Vender produto" (parcialmente coberta pelo caixa)
- [ ] DRE integrado comercialização + loja + custos (com Marcos)
- [ ] Migração multi-org (`usuario_organizacoes`) — ver `docs/PLANO_MULTI_ORG.md`
- [ ] Portal filiado: cotas, documentos, assembleias (MVP só saldo/login)
- [ ] Gestão caixa físico avançada (origem/destino multi-conta — tesouraria básica feita)
- [ ] Renomear cooperados → membros (futuro)
- [ ] Teste smoke completo em produção pós-redesign

## 📋 Bloqueado — aguardando contador (Marcos/Contabahia)

- CSC ID e CSC Token NFC-e
- NCMs dos produtos da loja
- Regime tributário confirmado
- CSTs ICMS/PIS/COFINS
- Emissão real NF-e/NFC-e via Focus NFe
- Teste CFOP 1159 NF-e entrada cooperado em homologação

---

> Atualizado em: 2026-07-05