-- Seed inicial do changelog — executar uma única vez no Supabase SQL Editor
insert into changelog_entries (data, modulo, itens) values
('2026-06-13', 'Dashboard Admin', '[
  "Card \"Cotação do Cacau\" adicionado ao dashboard de organizações do tipo cooperativa",
  "Cron diário (08:00 UTC) coleta cotação Cacau Bahia (precodocacau.com.br) e ICE NY + câmbio USD/BRL (Yahoo Finance)",
  "Sugestão de preços (cooperado/externo) calculada sobre a média das fontes, com percentuais configuráveis",
  "Botão \"Aplicar cotação\" grava a sugestão diretamente na tabela de cotações, com modal de confirmação",
  "Dois widgets TradingView ao vivo (cacau e USD/BRL) como referência visual de mercado"
]'::jsonb),
('2026-06-13', 'UI', '[
  "Botão \"Aplicar cotação\" padronizado para o componente Btn (estilo cinza, ícone refresh)",
  "Cabeçalho \"Painel de controle\" e data reposicionados no dashboard"
]'::jsonb),
('2026-06-13', 'Infra', '[
  "Corrigido cron schedule de \"a cada 6h\" para \"1x/dia\" (limite do plano Vercel Hobby)",
  "Corrigido erro de TypeScript (TS1501) em regex com flag dotAll no endpoint de cotações",
  "Corrigido middleware para isentar rotas /api/cron/* da autenticação de sessão"
]'::jsonb),
('2026-06-12', 'Fiscal / NF-e', '[
  "Integração de NF-e entrada via Focus NFe concluída e testada em homologação",
  "Fluxo completo: entrega → comprovante → modal NF-e → emissão → polling SEFAZ → DANFE → sincronização automática",
  "Migration 029b: ajuste de produtor_id → produtores, expansão de checks de status",
  "Correções de payload fiscal: data de emissão em UTC-3, código NCM, modalidade de frete, situações tributárias ICMS/PIS/COFINS"
]'::jsonb),
('2026-06-12', 'UI', '[
  "Componente Btn ganhou variante \"azul\" (#378ADD), aplicada nos botões Buscar/Limpar do caixa",
  "Removido título \"Caixa\" flutuante do cabeçalho da página de caixa (mantido botão Voltar)"
]'::jsonb),
('2026-06-11', 'Comercialização — Tesouraria Fase 1', '[
  "Migration 028 aplicada",
  "Relatório de fechamento de caixa em PDF A4 (pdf-lib, client-side)",
  "Comprovante de entrega ao produtor funcionando (correções de join e RLS)"
]'::jsonb),
('2026-06-09', 'Comercialização', '[
  "Módulo substancialmente completo: máscaras de CPF/kg, formatação inteligente de kg, detecção de Pix",
  "Separação \"Ver ficha\" / \"Ver perfil\", navegação contextual do caixa via query params",
  "Aporte/sangria com autenticação inline de admin",
  "Fechamento automático de caixa com contagem física opcional",
  "Diário de Caixa com drill-down por sessão",
  "Previsão de saldo do produtor e botão de retirada"
]'::jsonb),
('2026-06-01', 'Infra', '[
  "Domínio nexcoop.com.br configurado e propagado (DNS, A record e CNAME www)",
  "URL de autenticação do Supabase atualizada para o domínio de produção"
]'::jsonb);
