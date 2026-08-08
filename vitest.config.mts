import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Mesma configuração de nexcore e nexfin, de propósito: quem troca de
// repositório não deve trocar de hábito. environment 'node' porque o que se
// testa aqui é lógica pura e server-side — componente React não entra na
// suíte (precisaria de jsdom e de outra discussão).
export default defineConfig({
  test: {
    environment: 'node',
    // `include` restrito às pastas de código nosso, e não '**/*.test.ts'.
    // Este repositório tem `sites/coopaibi/` (espelho do site, ignorado pelo
    // git) com node_modules próprio dentro — o padrão amplo puxava os 1.885
    // testes internos do zod, 10 deles quebrando por dependência que não
    // temos. `exclude` com 'node_modules' cru também não resolvia: é caminho
    // literal, não casa node_modules aninhado.
    include: ['{app,components,lib,scripts,types}/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '.tmp/**'],
  },
  // `.mts` + fileURLToPath como no nexfin: em `.ts` o Vite avisa que carrega
  // ESM como CommonJS e que isso deixa de funcionar numa major futura.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
