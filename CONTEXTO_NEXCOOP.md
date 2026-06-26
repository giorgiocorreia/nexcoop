   # NexCoop — Contexto Atual

   > Detalhes permanentes em docs/ARQUITETURA.md | Schema em docs/SCHEMA.md | Módulos em docs/MODULOS.md

   ## Identificação rápida
   - **Org teste:** COOPAIBI — org_id `3ad97dc2-f87f-4e67-950e-387854d5bccc`
   - **Super admin:** gio.pessoal@gmail.com
   - **Org admin:** giorgio@coopaibi.com.br
   - **IA:** claude-haiku-4-5-20251001 via ANTHROPIC_API_KEY
   - **Claude Code:** `claude --dangerously-skip-permissions`

   ## Estado atual (21/06/2026)

   ### Loja Agropecuária — Entradas NF-e (21/06/2026)

   Migration 044 aplicada — campos fiscais em `loja_compras`:
   - `chave_acesso_nfe` TEXT
   - `serie_nfe` TEXT
   - `data_emissao_nfe` DATE
   - `emitente_nfe` TEXT
   - `cnpj_emitente` TEXT
   - `valor_nfe` NUMERIC(12,2)
   - `status_nfe` TEXT — 'com_chave' | 'sem_chave' | 'sem_nota' (default 'sem_chave')

   Arquivos implementados:
   - `app/(sistema)/loja/entradas/page.tsx` — server component com auth
   - `app/(sistema)/loja/entradas/EntradasNFeClient.tsx` — UI com KPIs, tabela filtrada, modal vincular (consulta SEFAZ), modal ver
   - `app/(sistema)/loja/entradas/actions.ts` — listarEntradasNFe, kpisEntradasNFe, consultarNFeNaSEFAZ, vincularNFe

   LojaHub atualizado: aba Compras exibe card "Entradas NF-e" → /loja/entradas

   Pendências abertas desta feature:
   - Campo status_nfe na tela Nova Compra (verificar se foi implementado)
   - Teste do endpoint Focus NFe em homologação para NF-e de terceiros
   - Ambiente de produção: variável FOCUS_NFE_TOKEN_HOMOLOGACAO deve ser substituída por FOCUS_NFE_TOKEN quando Marcos liberar dados reais

   ### Landing Page — v2 concluída

   Reestruturação completa de app/(landing)/page.tsx e criação de app/(landing)/DemoInterativa.tsx.

   Nova ordem de seções:
   1. Navbar — fundo #042C53, CTA WhatsApp verde
   2. Hero — foto bg-hero.jpg + overlay, mockup dashboard genérico
   3. Números — 284+ filiados, 13 telas contábeis, 7 dias, 100% nuvem
   4. Clientes — componente existente sem alteração
   5. Dores da presidência — 6 cards dor→resolução (NOVA)
   6. Funcionalidades — card contábil destaque + 12 módulos
   7. Telas Reais — 4 mockups do sistema sem logo de org (NOVA)
   8. Demo interativa — client component, 4 abas com useState
   9. Por que NexCoop — 6 diferenciais sobre foto de fundo
   10. Depoimento — João Matheus, Presidente COOPAIBI, com logo
   11. Planos — 4 planos + Enterprise, sem linha "isenção fiscal"
   12. CTA Final — foto de fundo, CTA único WhatsApp
   13. Rodapé — 4 colunas completas
   14. Botão WhatsApp flutuante — position fixed, canto inferior direito

   Fotos de fundo salvas em /public/images/:
   - bg-hero.jpg, bg-dores.jpg, bg-funcs.jpg, bg-depo.jpg, bg-cta.jpg

   CTA único em toda a página: https://wa.me/5573999693548
   Número WhatsApp NexCoop: 73999693548

   ### Razão Social
   Nexcoop Tecnologia Ltda — escolhida, SLU no Simples Nacional, em abertura.
   - Verificar disponibilidade: juceb.ba.gov.br
   - CNPJ necessário para verificação Meta Business Manager

   ### Meta Business Manager
   - Conta criada com perfil pessoal Giorgio Correia
   - Instagram conectado
   - WhatsApp pendente — aguarda CNPJ para verificação completa

   ### Agente WhatsApp — planejado
   Decisão tomada: Evolution API (Railway, gratuito) + Claude Haiku + webhook Next.js.
   ManyChat descartado — WhatsApp exclusivo do plano Pro pago.

   Fluxo planejado:
   Prospect → WhatsApp 73999693548 → Evolution API → webhook /api/whatsapp/webhook → Claude Haiku → resposta automática → se pedir humano → notifica Giorgio

   Script do bot definido com 3 opções de menu: conhecer sistema / ver planos / falar com equipe.

   ### Próxima sessão
   1. Chat dedicado: "NexCoop — Agente WhatsApp Evolution API"
      - Subir Evolution API no Railway
      - Conectar número 73999693548 via QR Code
      - Criar rota /api/whatsapp/webhook
      - Montar prompt do agente com contexto NexCoop
      - Lógica de transferência para humano
      - Deploy e teste
   2. Verificar landing page v2 no browser após deploy
   3. Migração multi-org (chat dedicado — ANTES do segundo cliente)

   ### Caixa aberto COOPAIBI
   - ID: `06ba0c91-47ac-4f10-bc7f-afe412b1b37d` — NÃO deletar

   ### Pendências externas
   - Marcos/Contabahia: CSC ID/Token NFC-e, NCMs, regime tributário, CSTs (inalterado)
   - Abertura Nexcoop Tecnologia Ltda (novo)
   - CNPJ para verificação Meta Business Manager (novo)

   ## Workflow desta sessão
   1. Giorgio descreve → Claude planeja → Claude Code executa
   2. Instrução ao Claude Code: sempre como bloco de código copiável
   3. Commit por feature completa (máx 5–6 arquivos), nunca WIP
   4. `npx tsc --noEmit` antes de todo commit
   5. Deploy só após feature set coerente
   6. Docs: atualizar só ao fim de sessão ou conclusão de fase
