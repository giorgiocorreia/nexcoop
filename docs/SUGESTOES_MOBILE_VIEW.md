# Sugestões de Mobile View — NexCoop

**Autor:** Grok (xAI)  
**Data:** 2026-07-21  
**Contexto:** avaliação visual da responsividade do sistema (`docs/ARQUITETURA.md` + shell + kit `PageLayout`/`HubStyles`)  
**Status:** P0 em implementação; P1/P2 planejados

---

## Diagnóstico resumido

| Dimensão | Nota (1–5) | Comentário |
|---|---|---|
| Estrutura / breakpoints | 4 | 1024 / 768 / 640 bem definidos |
| Consistência entre telas | 2.5 | `PageLayout` vs páginas com CSS avulso |
| Shell (menu + header) | 3 | Drawer funciona; hamburger pouco integrado |
| Densidade de dados | 2.5 | Tabelas e KPIs sofrem em telas estreitas |
| Toque / acessibilidade | 3 | Overlay ok; alvos 36px e inputs 14px fracos |
| Identidade da marca no mobile | 3.5 | Tokens bons; chrome mobile “admin genérico” |

A base (drawer, tokens HERO/COM_C, HubStyles) é sólida. O ganho principal é **polimento e consistência**, não redesenho do produto.

---

## O que já está bem

- Tokens `COM_C` / `HERO` com contraste e continuidade sidebar ↔ header
- Breakpoints documentados em `ARQUITETURA.md`
- Sidebar vira drawer abaixo de 768px (overlay + fecha na rota)
- HubStyles: KPI 6→3→2, cards, `clamp` em valores
- Login empilha em coluna; landing com `NavbarMobile`

---

## Problemas e sugestões

### 1. Hamburger “órfão” vs. header verde (P0)

**Problema:** botão branco flutuante (36×36, borda cinza, sombra) sobre a faixa HERO verde.

**Sugestão:**
- Integrar à marca: chip `rgba(255,255,255,0.18)`, ícone branco
- Alvo de toque **44×44**
- Alternar ícone menu ↔ X conforme drawer aberto
- Evento `sidebar-mobile-state` para sincronizar ícone

### 2. Header colapsa mal no mobile (P0)

**Problema:** breadcrumb + título + `acoes` com `flex-wrap` em min-height 60px.

**Sugestão:**
- ≤640px: esconder breadcrumb
- Título 16px, ellipsis, sem wrap
- Ações: wrap controlado ou colapso futuro em “⋯”
- Header com `flex-wrap: nowrap` e overflow controlado

### 3. Inconsistência entre módulos (P1)

**Problema:** CSS de responsividade copiado por página; drift visual.

**Sugestão:** concentrar media queries em `HubStyles` + `globals.css`; páginas novas só com `PageLayout`.

### 4. Tabelas densas (P1)

**Problema:** `<table>` multi-coluna ilegível em 360px.

**Sugestão:** ≤640px → cards/listas empilhadas; tabela a partir de tablet. Componente reutilizável futuro.

### 5. KPI grid apertado (P1)

**Problema:** 2 colunas + valores longos (R$) com ellipsis cedo.

**Sugestão:** &lt;360px 1 coluna; `clamp` no valor; esconder `com-kpi-sub` no mobile.

### 6. Drawer com pouca presença (P0 parcial / P1)

**Problema:** sem sombra lateral, sem X no botão, sem feedback forte.

**Sugestão:**
- `box-shadow` no drawer aberto
- Ícone X no hamburger
- (P1) swipe da borda, item ativo mais claro

### 7. Modal desktop no celular (P0)

**Problema:** centrado, padding 28, footer em linha.

**Sugestão:** ≤640px → bottom sheet (`align-items: flex-end`, radius só no topo, footer empilhado full-width).

### 8. Banners do layout (P0)

**Problema:** impersonation / trocar senha / parceiro em row não empilham.

**Sugestão:** classe `.nxc-sys-banner` com column + padding que respeita o hamburger.

### 9. Inputs e zoom iOS (P0)

**Problema:** `font-size: 14` força zoom no focus no iOS.

**Sugestão:** `font-size: 16px` em inputs/selects/textarea no mobile (CSS global).

### 10. Site público (P2)

**Problema:** `SiteNavbar` com scroll horizontal sem hierarquia de CTA.

**Sugestão:** drawer ou bottom bar; CTA pill fixo.

---

## Direção visual mobile

Manter identidade desktop:

- Faixa **HERO** (marca da org)
- Fundo `#D2D8D0` / cards brancos / borda `#BCC9BA`
- Cantos 12px, system-ui, pesos 600–800

Hierarquia alvo no mobile:

```
[ HERO compacto 56–60px: ☰  · título truncado ·  ⋮ ]
[ conteúdo padding 16, cards full-width               ]
[ (P2) bottom nav opcional: 4 destinos                ]
```

Menos chrome, mais conteúdo de campo.

---

## Roadmap

### P0 — em implementação (2026-07-21)

| # | Item | Onde |
|---|---|---|
| 1 | Hamburger na marca + 44px + ícone X | `MainContent.tsx`, `Sidebar.tsx` |
| 2 | Header compacto (sem breadcrumb) | `PageLayout.tsx`, `HubStyles.tsx` |
| 3 | Inputs 16px no mobile | `HubStyles.tsx` / `globals.css` |
| 4 | Banners empilhados | `layout.tsx` + CSS |
| 5 | Modal bottom sheet | `Modal.tsx` |
| 6 | Sombra no drawer | `Sidebar.tsx` |
| 7 | Largura = viewport (sem corte à direita) | `globals.css` (`--nxc-gutter`, `.nxc-shell`, `.nxc-bleed*`), `layout`/`MainContent` |

### P1 — próximo

- Padrão tabela → cards
- KPI &lt;360px e sub oculto
- Unificar media queries legadas
- Safe-area (`env(safe-area-inset-*)`)

### P2 — produto

- Bottom nav (Dashboard, Comercialização, Financeiro, Mais)
- Site COOPAIBI alinhado à landing
- Swipe para abrir drawer

---

## Breakpoints de referência (vigentes)

| px | Uso |
|---|---|
| 1024 | Tablet / charts 1 col |
| 768 | Sidebar → drawer |
| 640 | Header mobile, KPI 2 col, bottom sheet |
| 360 | (P1) KPI 1 col |

Ver também: `docs/ARQUITETURA.md` § Responsividade Mobile.

---

## Checklist de implementação P0

- [x] Documento criado
- [x] Hamburger integrado + estado aberto (`MainContent.tsx`, `Sidebar.tsx`)
- [x] Header PageLayout mobile (`PageLayout.tsx`, `HubStyles.tsx`)
- [x] HubStyles (breadcrumb hide, KPI sub hide, 360px 1 col)
- [x] Inputs 16px no mobile (`MainContent.tsx`)
- [x] Modal bottom sheet (`Modal.tsx`)
- [x] Banners `.nxc-sys-banner` (`layout.tsx` + CSS em `MainContent`)
- [x] Sombra no drawer + largura 280px
- [x] Atualizar trecho mobile em `ARQUITETURA.md`
