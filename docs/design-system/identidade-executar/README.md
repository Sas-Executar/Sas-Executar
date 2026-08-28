# Identidade EXECUTAR — fundação de tokens

Status: **fundação v1** — define o vocabulário; a migração tela por tela para
consumi-lo é o passo seguinte, feita incrementalmente, não neste commit.

Implementação: `packages/design-system/styles/exec-tokens.css` (importado por
`packages/design-system/styles/globals.css`, disponível em qualquer app que
já consome `@repo/design-system`).

## Por que isto existe

O produto tinha três camadas de estilo coexistindo sem se falar:

1. `@repo/design-system` — base shadcn/Tailwind (OKLCH), quase não usada pelas
   telas de produto (dashboard, Scanner, Mapa-OS).
2. CSS artesanal por tela (`executar.css`, `handoff.css`, `mapa-os.css`,
   `scanner.css`) — cada um com sua própria régua de espaçamento e cor
   cravada em hexadecimal.
3. `apps/mobile/tamagui.config.ts` — uma terceira declaração de tokens
   parecidos, mas não idênticos, sem ligação com as duas de cima.

Espaçamento real hoje em `executar.css`: `6, 7, 8, 10, 11, 12, 13, 14, 16, 18,
20px` — nenhuma régua fechada. Raio: `14, 16, 18, 24, 26px, 50%, 999px` — sem
os dois vocabulários (objeto vs. chrome) que tanto Fluent 2 quanto a Apple HIG
recomendam. Esta fundação resolve a causa, não o sintoma: um vocabulário só,
que os três lugares acima passam a importar em vez de reinventar.

## Outros sistemas de design já registrados neste ecossistema (não usados aqui)

Duas explorações anteriores existem e **não foram adotadas** nesta fundação —
registradas aqui para não serem redescobertas por acidente:

- **Fractal Fluent** (`~/.claude/skills/.../executar-design/references/
  fluent-ui-kit.md` + `assets/exec-tokens.css`) — um redesign alternativo
  inteiro em azul, com a regra explícita "nunca verde para concluído". É uma
  proposta ("primeira proposta", nas palavras do próprio arquivo), não algo
  em produção. Diverge da paleta já confirmada com o usuário (verde =
  entregável, âmbar = ação). Se a direção for migrar pra essa linguagem no
  futuro, é uma troca de 3 variáveis de cor nesta fundação, não uma reescrita.
- **3PN + Good Path** (`docs/design-system/3pn-good-path/`) — um componente
  específico (cartão Problema/Progresso/Próximo-passo + seletor de workflows
  reutilizáveis), com handoff próprio marcado **"CANONICAL / NO VISUAL
  DRIFT"**. Não é a identidade do app inteiro — é um componente isolado,
  ainda não implementado no código atual, com paleta própria (creme/laranja)
  que a própria documentação já prevê que pode conviver com um design system
  global diferente (regra de governança do `TOKENS.md`: aliasar quando o
  valor bater, nunca substituir silenciosamente quando não bater). Ao
  implementar esse componente no futuro, os tokens dele valem como estão —
  não force esta fundação nele.

## Regras (o que importa mais que os números)

### Cor é sempre presentacional, nunca estrutural

Trocar o acento (verde → azul, âmbar → outra cor) não pode mudar hierarquia,
layout ou dado — só a leitura visual de superfície. Por isso cor vive em uma
camada `raw` (não referenciar direto) e uma camada `alias` semântica (o que o
componente realmente usa: `--exec-color-entregue`, não `--exec-raw-green-50`).

### Papéis de cor fixos (mantidos do que já está em produção)

| Papel | Token | Valor | Uso |
|---|---|---|---|
| Fundo | `--exec-color-canvas` | `#F4F6F5` | fundo de tela |
| Superfície | `--exec-color-surface` | `#FFFFFF` | cards, painéis |
| Superfície fria | `--exec-color-surface-subtle` | `#E1E2E6` | zonas secundárias |
| Texto | `--exec-color-foreground` | `#39393B` | texto primário |
| Texto secundário | `--exec-color-foreground-secondary` | `#73736D` | meta, legendas |
| **Entregue/concluído** | `--exec-color-entregue` | `#1BA957` (verde) | **nunca trocar sem decisão explícita** |
| Ação | `--exec-color-acao` | `#E8A317` (âmbar) | CTA primário, estado atual — confirmado com o usuário em 27/08/2026 |
| Ação secundária | `--exec-color-acao-secundaria` | `#167EFE` (azul) | ações de apoio |
| Erro | `--exec-color-erro` | `#D13438` | só quando existe erro real |

### Hierarquia de traço — 4 pesos, nunca um só

`stroke-subtle` (8% de opacidade sobre o texto) → `stroke-default` (16%) →
`stroke-strong` (28%) → `stroke-selected` (cor de ação). Derivados da cor de
texto por `color-mix`, não hexadecimais soltos — uma troca de acento recalcula
a hierarquia inteira sozinha.

### Espaçamento — régua fechada de 4px

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64` — nunca um valor fora dela.
Mesma régua do Fluent 2 e do quadro de tokens enviado pelo usuário em
28/08/2026; já estava documentada, nunca foi seguida à risca no CSS real.

### Dois vocabulários de raio

- `--exec-radius-object` (12px) — cartões, objetos com identidade própria do
  produto (Project/Cycle/Day/Task/Action).
- `--exec-radius-control` (8px) — chrome de interação: botão, input, menu.
- `--exec-radius-pill` (999px) — chips, badges, avatares.

Nunca a mesma decisão de raio para objeto e para chrome — é a mesma regra do
Fluent 2 e de `production-standards.md` da skill `executar-design`.

### Elevação — nível 0 por padrão

Sombra só existe para overlays reais (sheet, modal, menu flutuante) — nunca
para decorar um card em repouso. Quatro níveis definidos
(`--exec-elevation-0..3`), mas o padrão de qualquer componente novo é `0`.

### Alvo de toque mínimo — 44×44px

Fluent 2 e a Apple HIG concordam exatamente no mesmo número — nenhuma
ambiguidade aqui. Todo elemento interativo (botão, ícone clicável, item de
lista tocável) respeita esse mínimo, especialmente relevante dado que o uso
real é majoritariamente por celular.

### Safe area — obrigatório em qualquer chrome fixo

Barra inferior, cabeçalho fixo ou qualquer elemento colado numa borda da tela
usa `--exec-safe-top/bottom/left/right` (`env(safe-area-inset-*)`) — sem isso,
em iPhones com notch/home indicator, o conteúdo fica atrás da interface do
sistema.

### Tipografia

Corpo em fonte de sistema (`-apple-system`/Segoe/Arial — perto o bastante da
métrica San Francisco e Segoe para não precisar de uma terceira família);
dado/rótulo em JetBrains Mono. Escala fechada: `display 40 · title-1 32 ·
title-2 24 · title-3 20 · body 16 · caption 12 · label 11`.

### Movimento — funcional, nunca decorativo

100–260ms, sempre ligado a uma mudança de estado real (conclusão, transição
de tela) — nunca uma animação de entrada só para "dar vida" à tela.

## Próximos passos (fora do escopo desta fundação)

1. Migrar `executar.css`, `handoff.css`, `mapa-os.css`, `scanner.css` para
   consumir `var(--exec-*)` em vez de valores próprios — arquivo por arquivo.
2. Portar a mesma tabela de papéis de cor + régua de espaçamento para
   `apps/mobile/tamagui.config.ts`, para que web e nativo parem de divergir.
3. Auditoria de rotas/botões (reduzir `/scanner` para sheet/modal em vez de
   rota própria, revisar os "views" internos do dashboard) — navegação mobile
   com tab bar inferior como referência primária, desktop adaptado a partir
   dela.
