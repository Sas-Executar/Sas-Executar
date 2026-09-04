# Corpus de fixtures OCR — Scanner OCR-first V2 (PR-08)

Nível L1 do plano "Scanner OCR-first V2" (handoff técnico): imagens
estáticas sintéticas dos 5 tokens administrativos (ENTRADA/COPILOTO/
SELETOR/FEITO/SAIDA), em variações que aproximam condições reais de
captura por câmera. Serve para (a) medir precisão/latência do OCR antes de
mudar qualquer constante de calibração — "não assumir o vencedor, medir" —
e (b) como corpus de regressão reutilizável pelos próximos níveis (PR-09
vídeo/câmera falsa, PR-10 gate de performance).

## Estrutura

```
tests/fixtures/scanner/
  manifest.json          # lista {path, actionId, variation} de cada fixture
  entrada/*.png
  copiloto/*.png
  seletor/*.png
  feito/*.png
  saida/*.png
```

30 imagens (5 palavras × 6 variações), ~260 KB no total. Cada variação
aproxima um eixo de degradação de captura citado pelo handoff:

| Variação           | Eixo               | O que muda                                        |
| ------------------- | ------------------- | -------------------------------------------------- |
| `base`              | —                    | Baseline limpo (mesmo estilo do benchmark existente em `tests/e2e/scanner-ocr.spec.ts`) |
| `distancia-longe`   | distância/escala     | Fonte menor — alvo mais longe do quadro            |
| `distancia-perto`   | distância/escala     | Fonte maior — alvo mais perto, ocupa mais quadro   |
| `perspectiva`       | perspectiva          | `rotateX` 3D — câmera não perpendicular ao cartão  |
| `contraste-baixo`   | contraste            | `filter: contrast(0.35)` — tinta desbotada/reflexo |
| `desfoque`          | blur                 | `filter: blur(2.2px)` — movimento ou fora de foco  |

## Como (re)gerar

```
node apps/app/scripts/scanner/gerar-fixtures-ocr.mjs
```

Usa `@playwright/test` (já uma dependência) para renderizar cada variação
numa página e tirar screenshot — mesma técnica já usada em
`tests/e2e/scanner-ocr.spec.ts`, sem exigir foto real nem dependência
nova. Em ambientes cujo Chromium instalado está numa revisão diferente da
que essa versão do Playwright espera, exporte `PLAYWRIGHT_CHROMIUM_PATH`
apontando pro binário disponível antes de rodar.

## Como medir (calibração de PSM)

```
bun apps/app/scripts/scanner/medir-corpus-ocr.mjs
```

Roda os 30 fixtures contra os 4 modos de PSM que o handoff pede pra
comparar, usando a mesma whitelist de caracteres/DPI já em produção
(`scanner-engine/ocr-worker.ts`), e classifica cada leitura como:

- **correto** — resolve para o `actionId` esperado;
- **ação falsa** — resolve para um `actionId` ERRADO (o caso perigoso: uma
  mutação de domínio incorreta seria disparada);
- **inconclusivo** — não resolve para nenhuma ação (seguro — o consenso
  nunca teria confirmado, só aguardaria mais leituras).

### Resultado medido (30/30 fixtures)

| PSM                     | acertos | ação falsa | inconclusivo | latência média | latência p95 |
| ------------------------ | ------- | ---------- | -------------- | ---------------- | -------------- |
| **SPARSE_TEXT (atual)**  | 30/30   | 0          | 0              | 34 ms            | 44 ms          |
| SINGLE_WORD              | 2/30    | 0          | 28             | 32 ms            | 43 ms          |
| SINGLE_LINE              | 30/30   | 0          | 0              | 30 ms            | 43 ms          |
| RAW_LINE                 | 2/30    | 0          | 28             | 32 ms            | 40 ms          |

(Latências são só do `worker.recognize()` sobre a imagem já pronta — não
incluem captura de câmera/gate de qualidade/ROI; o orçamento ponta-a-ponta
de 3.000 ms e os percentis p50/p95/p99 do pipeline completo são medidos na
PR-10, "Performance Gate CI".)

## Decisões de calibração

**`PSM.SPARSE_TEXT` mantido.** Não é o "vencedor" por padrão — é o único
modo, empatado com `SINGLE_LINE`, que resolveu 100% do corpus sem nenhuma
ação falsa. A diferença de latência entre os dois (~4 ms) está dentro do
ruído de medição para 30 amostras e é irrelevante frente ao orçamento de
3.000 ms. `SINGLE_WORD`/`RAW_LINE` falham quase totalmente (`confidence: 0`
na maioria das leituras) porque esperam um recorte exato ao redor de uma
única palavra, sem nenhuma margem — o ROI real de produção inclui a
margem/ícone do cartão impresso ao redor do rótulo, que `SPARSE_TEXT`/
`SINGLE_LINE` toleram e os outros dois não. Entre os dois empatados,
`SPARSE_TEXT` é mantido por ser estruturalmente mais seguro para o layout
real do cartão, que pode ter mais de um elemento visual no recorte (o
ícone do símbolo ao lado do texto) — `SINGLE_LINE` assume que todo o
recorte é uma única linha de texto, uma suposição mais frágil.

**Fração de ROI (`FRACAO_ROI_PADRAO`, `roi-preprocessor.ts`) — NÃO
recalibrada nesta PR.** Este corpus L1 é de imagens JÁ recortadas (o
equivalente ao que o worker OCR recebe depois do crop) — não tem o
contexto do quadro inteiro da câmera necessário para medir se 82% do menor
lado é a fração certa (isso exige variar o tamanho/posição do token DENTRO
de um quadro maior, não só o texto isolado). Essa calibração fica para a
PR-09 (câmera falsa via vídeo `.y4m`), que terá quadros completos de
verdade para medir contra — mudar a fração agora seria decidir sem medir,
exatamente o que o handoff pede para evitar.

**Atualização (PR-09):** com quadros completos disponíveis
(`tests/fixtures/scanner-camera/README.md`), uma medição preliminar (não
conclusiva — uma palavra, uma posição, sem repetição) não encontrou sinal
para mudar 0.82 na escala usada pelo fixture de câmera; para um token
bem mais perto da câmera, o resultado foi instável em toda fração
testada, incluindo a atual — investigação mais ampla fica como próximo
passo, ver detalhes no README do L2.
