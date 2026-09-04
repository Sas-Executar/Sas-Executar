# Fixture de câmera falsa — Scanner OCR-first V2 (PR-09)

Nível L2 do plano "Scanner OCR-first V2" (handoff técnico): um vídeo
sintético (`sessao-cinco-acoes.y4m`) para `--use-file-for-fake-video-
capture` do Chromium, consumido por um `getUserMedia()` REAL em
`tests/e2e/scanner-fake-camera.spec.ts` — supera o benchmark estático do
L1 (`tests/fixtures/scanner/`, imagens já recortadas, sem câmera nenhuma),
provando o pipeline ponta-a-ponta: câmera → OCR → vocabulário fechado →
consenso → ACTION LOCK → command dispatcher → domínio.

## Conteúdo

`sessao-cinco-acoes.y4m` — 320×240, 1fps, 38 quadros (~38s): uma sessão de
captura contínua ciclando pelos 5 tokens administrativos, cada um sobre um
fundo cinza médio (não branco — ver "Por que cinza médio", abaixo),
sustentado por 3s e separado por um intervalo em branco (3s, exceto o
primeiro branco, alongado para 8s de propósito — ver "Branco inicial").

```
ENTRADA (3s) → branco (3s) → COPILOTO (3s) → branco (3s) → SELETOR (3s) →
branco (3s) → FEITO (3s) → branco (3s) → SAIDA (3s) → branco (3s)
```

## Como (re)gerar

```
node apps/app/scripts/scanner/gerar-fixture-camera-y4m.mjs
```

**Sem dependência de `ffmpeg`.** O `ffmpeg` empacotado em alguns ambientes
de execução (`/opt/pw-browsers/ffmpeg-*`) é uma build mínima específica do
Playwright — só grava `.webm` via VP8 (recurso de vídeo de teste), sem o
muxer `yuv4mpegpipe`. Em vez disso, o gerador desenha cada quadro num
`<canvas>` real via Playwright, extrai os pixels RGBA crus com
`getImageData` e escreve o container Y4M (cabeçalho + `FRAME` + planos
Y/U/V em I420, conversão BT.601 faixa completa) manualmente — formato
simples o bastante para não precisar de biblioteca nenhuma. Em ambientes
cujo Chromium instalado está numa revisão diferente da que essa versão do
Playwright espera, exporte `PLAYWRIGHT_CHROMIUM_PATH` antes de rodar (mesma
variável usada por `gerar-fixtures-ocr.mjs`/`medir-corpus-ocr.mjs`, do L1).

## Como rodar o E2E

```
bun run test:scanner-fake-camera
```

Lança um Chromium com `--use-fake-device-for-media-stream` e
`--use-file-for-fake-video-capture=<este arquivo>`, abre uma página local
mínima (não o app Next.js — ver "Por que não o app real", abaixo), inicia
`getUserMedia()`, e roda um laço de amostragem a cada 620ms (idêntico ao
intervalo de produção) chamando as funções REAIS de `scanner-engine/`:
gate de qualidade, worker OCR, resolver, consenso, ACTION LOCK, observador
de lock-clear e command dispatcher — dirigido por pixels reais capturados
da câmera falsa real. Ao final, verifica que os 5 comandos administrativos
foram despachados na ordem certa e que o domínio (`novoEstado`/
`entregasAtivas`) reflete a mutação esperada (foco assumido por "entrada",
entrega concluída por "feito").

### Por que não o app real (Next.js/Clerk)

`/scanner` fica atrás de `(authenticated)/layout.tsx`, que exige uma sessão
Clerk real (`currentUser()`/`auth()`) — não há chave de teste Clerk
configurada neste repositório, e simular isso exigiria mudar a arquitetura
de auth só para viabilizar um teste, fora do escopo desta PR. O teste
importa e roda direto as mesmas funções reais do `scanner-engine` que
`useScannerEngine` (PR-07) orquestra em React — mesma técnica de escopo já
usada em `scanner-ocr.spec.ts` (contornar o app inteiro, testar a peça
real isoladamente). A única parte reimplementada (não importada) é o
recorte da ROI dentro do navegador (`page.evaluate` não executa módulos TS
reais sem um bundler) — a geometria do recorte em si (`calcularRetanguloRoi`)
é real, e a corretude do recorte já está coberta pelos testes unitários de
`roi-preprocessor.ts` (PR-04).

### Por que cinza médio, não branco

O filtro `grayscale(1) contrast(1.65)` real do OCR (`roi-preprocessor.ts`)
empurra qualquer fundo perto do branco puro pro teto de luminância —
`avaliarQualidadeFrame` rejeitava TODO quadro como `exposicao_inadequada`,
mesmo sem nenhum texto nele. `#969696` (150,150,150) sobrevive ao boost de
contraste dentro da faixa aceita nos dois casos (com e sem token no
quadro).

### Por que 36px de fonte, não menos

Medido empiricamente: abaixo de ~30px a cobertura de tinta do texto (área
de pixels escuros ÷ área do quadro) fica abaixo dos 3% mínimos exigidos por
`possuiForegroundMinimo` (`frame-quality.ts`) — mesmo com o texto
perfeitamente legível a olho nu e reconhecível pelo OCR. O gate de presença
assume um token ocupando uma fração maior do quadro do que "legível" por
si só garante; 36px dá margem confortável (ver medição na seção seguinte).

### Branco inicial mais longo

O primeiro intervalo em branco é 8s (não 3s como os demais) — absorve o
aquecimento do worker OCR + setup do `getUserMedia()` no teste (handoff
§4: câmera só deve "importar" depois do worker pronto), pra "entrada" ser
confiavelmente o primeiro reconhecimento amostrado, não uma corrida contra
o relógio de setup.

## Calibração de ROI (`FRACAO_ROI_PADRAO`) — sinal preliminar, não conclusivo

O L1 (`tests/fixtures/scanner/README.md`) deixou essa calibração em aberto
por não ter quadros completos de câmera pra medir contra — só o recorte já
pronto. Este fixture L2 finalmente tem esse contexto, então uma medição
rápida foi feita (não uma recalibração formal — ver ressalvas abaixo):

| Fração testada | fonte 36px (escala deste fixture) | fonte 60px (token bem mais perto) |
| --------------- | ------------------------------------ | ------------------------------------ |
| 0.5              | confidence 84 (texto cortado)         | confidence 87 (texto cortado)         |
| 0.6              | confidence 0 (texto cortado)          | confidence 89                         |
| 0.7              | confidence 0 (texto cortado)          | confidence 0                          |
| **0.82 (atual)** | **confidence 90 — OK**                | confidence 10 (instável)              |
| 0.9              | confidence 91 — OK                    | confidence 89                         |
| 1.0              | confidence 91 — OK                    | confidence 17 (instável)              |

**Conclusão para a escala deste fixture (36px, a mesma usada no E2E):**
0.82 (valor atual de produção) funciona bem — frações menores (0.5–0.7)
cortam o texto antes de caber no recorte. Nenhum sinal pra mudar o padrão
nesta escala.

**Mas para um token bem mais perto da câmera (60px)**, o resultado é
inconsistente em TODAS as frações testadas, incluindo a atual — sugere que
o recorte pode cortar caracteres perto da borda de forma sensível ao
alinhamento exato de pixel, não só à fração escolhida. Esta é uma medição
com UMA palavra, UMA posição (sempre centralizada), sem repetição nem
variação de alinhamento — poder estatístico baixo demais para justificar
mudar `FRACAO_ROI_PADRAO` a partir dela. Fica documentado como sinal para
investigar com um corpus mais amplo (várias posições/escalas do token
dentro do quadro, não só um caso centralizado) — não decidido às cegas, e
não bloqueia esta PR.
