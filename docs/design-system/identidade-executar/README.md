# Identidade EXECUTAR — fundação de tokens

Status: **fundação v2 — kit Fluent como Source of Truth**. Decisão do
usuário em 30/08/2026: o kit "Fractal Fluent" da skill `executar-design`
(cinza neutro de verdade, azul como cor de marca/CTA, raio quase reto)
passa a valer integralmente, inclusive onde diverge do que já estava em
produção desde a v1 (PR #77) — com duas exceções explícitas: **verde
continua sendo "concluído"** (o kit usa azul+check; descartamos só esse
ponto) e **Mapa-OS continua sendo projeção somente-leitura** (não vira
documento editável). Ver o header de `exec-tokens.css` para o detalhe
completo raw → alias da v2.

`--exec-color-acao`/`--exec-color-acao-secundaria` (nomes da v1)
continuam existindo como **alias** pros nomes novos
`--exec-color-brand`/`--exec-color-brand-hover` — os arquivos de tela que
já consomem esses nomes (`executar.css`, `handoff.css`, `mapa-os.css`,
`scanner.css`, `web-surface.css`) recebem o azul automaticamente, sem
precisar ser reescritos só por causa da troca de valor. Onde um desses
arquivos usava `--exec-color-acao` pra um papel de aviso/pendência (não
CTA — `.executarAprovacao`/`.executarSyncNotice` em `executar.css`,
`--mo-notes-proximo`/semáforo em `mapa-os.css`, `.scannerAviso` de câmera
indisponível em `scanner.css`), foi trocado pontualmente pro novo
`--exec-color-warning`, que preserva o âmbar só nesse papel mais estreito.

Migração de telas (v1, ainda válida): `executar.css`, `handoff.css`,
`mapa-os.css`, `scanner.css` e `web-surface.css` consomem `var(--exec-*)`
em vez de hexadecimais soltos. Dois bugs semânticos reais foram
corrigidos nessa migração (não só renomeados): `--line`/`--muted`/
`--blue2`/`--shadow` em `executar.css` eram custom properties nunca
definidas neste build (herdadas do protótipo legado) — todo elemento que
as usava renderizava com cor inválida; e o "arco de execução"/indicadores
de "atual" em `handoff.css` usavam azul/ciano/lima-verde, colidindo com o
verde reservado para "concluído" — alinhados ao acento de ação (âmbar na
v1, azul na v2, via o mesmo token). Os 4 gradientes decorativos dos
cartões de contexto (Projetos/Documentos/Copiloto/Scanner) e o acento
"bloqueado" ficaram como cor local documentada — são categóricos, não
papéis de estado.

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

## Outros sistemas de design já registrados neste ecossistema

- **Fractal Fluent** (`~/.claude/skills/.../executar-design/references/
  fluent-ui-kit.md` + `assets/exec-tokens.css`) — **adotado como Source of
  Truth a partir da v2** (30/08/2026), com a única exceção documentada
  acima (verde continua "concluído"; o kit original propunha azul+check
  pra esse papel também). Antes disso era registrado aqui como "não
  adotado" — histórico preservado pra quem consultar versões antigas
  deste README.
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

### Papéis de cor fixos

| Papel | Token | Valor | Uso |
|---|---|---|---|
| Fundo | `--exec-color-canvas` | `#FFFFFF` | fundo de tela |
| Superfície | `--exec-color-surface` | `#FFFFFF` | cards, painéis |
| Superfície fria | `--exec-color-surface-subtle` | `#FAFAFA` | zonas secundárias |
| Texto | `--exec-color-foreground` | `#242424` | texto primário |
| Texto secundário | `--exec-color-foreground-secondary` | `#616161` | meta, legendas |
| **Entregue/concluído** | `--exec-color-entregue` | `#1BA957` (verde) | **nunca trocar sem decisão explícita** — única exceção ao kit Fluent |
| Marca/ação | `--exec-color-brand` | `#0F6CBD` (azul) | CTA primário, estado atual — kit Fluent, decisão do usuário em 30/08/2026 |
| Marca — hover/apoio | `--exec-color-brand-hover` | `#115EA3` (azul) | hover de CTA, ações de apoio |
| Aviso/pendência | `--exec-color-warning` | `#E8A317` (âmbar) | só aviso/pendência real — nunca CTA |
| Erro | `--exec-color-erro` | `#D13438` | só quando existe erro real |

`--exec-color-acao`/`--exec-color-acao-secundaria` (nomes da v1) seguem
existindo como alias de compatibilidade pra `--exec-color-brand`/
`--exec-color-brand-hover` — ver nota de fundação v2 no topo deste
documento.

### Hierarquia de traço — 4 pesos, nunca um só

`stroke-subtle` (`#F5F5F5`) → `stroke-default` (`#EDEDED`) → `stroke-strong`
(`#D1D1D1`) → `stroke-selected` (azul de marca). Escala discreta de cinza
(kit Fluent), não mais derivada por `color-mix` sobre a tinta como na v1.

### Espaçamento — régua fechada de 4px

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64` — nunca um valor fora dela.
Mesma régua do Fluent 2 e do quadro de tokens enviado pelo usuário em
28/08/2026; já estava documentada, nunca foi seguida à risca no CSS real.

### Dois vocabulários de raio

- `--exec-radius-object` (2px) — cartões, objetos com identidade própria do
  produto (Project/Cycle/Day/Task/Action). Mais reto que a v1 (era 12px) —
  valor do kit Fluent.
- `--exec-radius-control` (6px) — chrome de interação: botão, input, menu.
  Era 8px na v1.
- `--exec-radius-overlay` (8px) — sheet, modal, menu flutuante — raio
  distinto de controle.
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

1. ~~Migrar `executar.css`, `handoff.css`, `mapa-os.css`, `scanner.css` para
   consumir `var(--exec-*)`~~ — feito (ver Status acima). Elevação de cards em
   repouso segue com sombra em telas legadas (`handoff.css`) — a regra
   "elevação 0 por padrão" desta fundação vale para componentes novos; migrar
   as telas legadas pra zero-sombra é uma decisão visual própria, não incluída
   aqui.
2. Portar a mesma tabela de papéis de cor + régua de espaçamento para
   `apps/mobile/tamagui.config.ts`, para que web e nativo parem de divergir.
3. Auditoria de rotas/botões (reduzir `/scanner` para sheet/modal em vez de
   rota própria, revisar os "views" internos do dashboard) — navegação mobile
   com tab bar inferior como referência primária, desktop adaptado a partir
   dela.
