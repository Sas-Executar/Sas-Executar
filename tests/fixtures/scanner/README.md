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
PR-10, "Performance Gate CI" — ver `tests/e2e/scanner-performance-gate.spec.ts`.)

### Gate de performance automatizado (PR-10)

`bun run test:scanner-performance-gate` transforma a medição acima num
GATE de CI: falha o build se a latência regredir além do critério de
aceite do handoff (`warm p50<1200ms/p95<2200ms/p99<3000ms`) ou se o cold
start do worker OCR passar de uma folga generosa (15s — sem medição de
dispositivo real disponível pra apertar mais, o alvo é pegar regressão
grosseira, não calibrar fino). Modela "latência de tentativa" como
`INTERVALO_RECONHECIMENTO_MS (620ms, a cadência real de amostragem) +
T_ocr medido` — uma aproximação do caminho comum (confiança alta,
confirmação numa única leitura), não uma medição de câmera real ponta-a-
ponta (essa prova é a PR-09). Ver o comentário do arquivo de teste para o
raciocínio completo, incluindo os limites dessa aproximação.

Medido neste ambiente (30/30 fixtures, `SPARSE_TEXT`): p50≈656ms,
p95≈680ms, p99≈740ms, cold start≈500-650ms — bem dentro dos limites,
com folga suficiente pra absorver runners de CI mais lentos que este
sandbox.

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

## Independência de QR (PR-11 — última do plano)

O handoff original descreve a arquitetura de hoje como "3 scanners
independentes convergindo em `processarPayload()`" (QR via `qr-scanner`,
forma via `useSymbolScanner`, OCR via `useTesseractSymbolScanner`) e pede
pra inverter isso: OCR vira o caminho primário dos 5 comandos
administrativos, QR sai de dependência operacional pra compatibilidade
legada — mas só depois de provado, nunca antes ("Não remover QR no
início. Primeiro comprovar que o caminho TESSERACT → ACTION passa em todo
o gate.").

`apps/app/__tests__/scanner-qr-independencia.test.ts` é essa prova:
`vi.mock("qr-scanner", ...)` faz qualquer importação do pacote lançar, e
o teste despacha os 5 comandos administrativos numa sessão contínua
(entrada→copiloto→seletor→feito→saida) pela cadeia real de produção
(`criarScannerEngine` → `criarConsensusEngine`/`processarReconhecimento` →
`despacharComando` → domínio) — se qualquer módulo desse caminho
importasse `qr-scanner`, mesmo indiretamente, o teste falharia
imediatamente. Ele passa: nenhum arquivo de `scanner-engine/` importa
`qr-scanner` (confirmado por inspeção direta — o único import real do
pacote no repositório inteiro é em `scanner-client.tsx`, pro laço de
decodificação de QR em si).

**O que muda:** nada no código de produção — `scanner-client.tsx` continua
com seu `<QrScanner>` ativo, exatamente como antes. O que muda é o que
fica provado e documentado: os 5 comandos administrativos não dependem
mais de QR nenhum (o pipeline OCR-first das PR-02 a PR-10 já os resolve
sozinho); QR permanece só para os payloads que esse vocabulário fechado
nunca cobriu — link de tarefa/documento e atalho de destino
(`resolverPayloadScanner`, kinds `"tarefa"`/`"destino"`/`"qr_jump"`).
Remover o `<QrScanner>` de fato (ou os cartões impressos com QR do
Mapa-OS) é uma decisão de produto separada, fora do escopo desta prova
técnica.

## Resumo do plano "Scanner OCR-first V2" (PR-01 a PR-11)

| Critério de aceite (handoff) | Onde foi provado |
| ------------------------------ | ------------------- |
| 5/5 comandos funcionando | PR-09 (câmera falsa e2e) + PR-11 (unitário) |
| Independência de QR comprovável desabilitando `qr-scanner` | PR-11 (`scanner-qr-independencia.test.ts`) |
| ≥99% acerto / ≈0 ação falsa em corpus controlado | PR-08: 30/30 (100%), 0 ação falsa, `SPARSE_TEXT` |
| warm p50<1200ms / p95<2200ms / p99<3000ms | PR-10 (gate automatizado): ~656/667/713ms medido |
| Idempotência — um token retido = uma ação | ACTION LOCK (PR-02) + consenso (PR-05) + observador de lock-clear (PR-06/07) |
| Falha de OCR nunca quebra câmera/domínio | QR mantém laço próprio, independente do estado do engine OCR (`scanner-client.tsx`) |
| Observabilidade estruturada por tentativa | `RecognitionResult` com instrumentação completa de latência (PR-01/03) + métricas do engine (PR-02) |

Os 11 PRs, em ordem: PR-01 Scanner Contracts · PR-02 Scanner Engine ·
PR-03 Persistent OCR Worker · PR-04 Frame/ROI Pipeline · PR-05 Recognition
+ Consensus · PR-06 Command Dispatcher · PR-07 ScannerClient Adapter ·
PR-08 OCR Fixture Corpus (este README) · PR-09 Playwright Fake Camera
(`tests/fixtures/scanner-camera/`) · PR-10 Performance Gate CI · PR-11
QR Independence.
