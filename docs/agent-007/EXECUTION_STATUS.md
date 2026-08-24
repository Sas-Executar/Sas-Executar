# Execução das ondas · Agent-007

**Início:** 24/08/2026  
**Branch:** `feat/agent-007-waves-foundation`  
**Gate 0:** aprovado pelo usuário e incorporado à `main` no commit `4ca246c`

## Estado executivo

O desenvolvimento foi iniciado como uma fundação vertical, sem ampliar a UI.
O núcleo continua dentro de `apps/app/lib/executar`; não foi criado um novo
package porque ainda não existe um segundo consumidor de domínio.

| Onda | Estado | Implementado nesta branch | Gate ainda aberto |
|---|---|---|---|
| 1 · Núcleo | EM EXECUÇÃO | política de conclusão v2 com migração legada; catálogo canônico e alias `/situacao`; ledger determinístico de runs/efeitos; lock/replay; migração AWS e testes | aplicar migração em Aurora real, persistir ledger transacionalmente e provar concorrência no banco |
| 2 · Operação | INICIADA | preview de onboarding nos quatro modos; importação atômica em memória; registry/preflight de bindings; `/bomdia` idempotente | adapters Drive/Linear autenticados, paginação/cache, scheduler e rollover persistido |
| 3 · Projeção | INICIADA | projection service somente leitura; registry de templates; precedência de tokens e override justificado | renderer final, offline/print, QR decodificado, E2E conectado e piloto de sete dias |

`INICIADA` não equivale a `PASS`. Os itens dependentes de infraestrutura externa
e tempo corrido permanecem explicitamente abertos.

## Tratamento do legado

| Decisão | Materiais | Motivo |
|---|---|---|
| PRESERVAR | PWA original, estado/grafo, Clerk, Aurora/S3, RLS, aprovação humana e testes existentes | já formam a autoridade e o núcleo operacional do produto |
| PORTAR | contratos do Copiloto, política de conclusão, catálogo de comandos, bindings e projection contract | completam lacunas sem criar uma segunda fonte de verdade |
| SUBSTITUIR | comando identificado por token livre; renderers com conhecimento implícito do estado; rotinas sem run ledger | contratos únicos e funções determinísticas reduzem divergência e duplicação |
| DESCARTAR | estado concorrente em Drive/Linear, sincronização bidirecional genérica e traces privados | violam autoridade canônica, auditabilidade ou política de dados |

## Gates de validação

1. **Fundação local:** lint, tipos e testes completos do monorepo.
2. **Persistência real:** migração `003` aplicada via Data API; prova de RLS,
   unique idempotency key e índice de lock concorrente.
3. **Conectores:** credenciais e bindings dedicados; falha recuperável sem
   sucesso parcial silencioso.
4. **Renderer:** projeção validada antes do template; artefatos offline, impressão
   fiel e QR decodificável no tamanho final.
5. **E2E/piloto:** matriz crítica em PASS e sete dias corridos sem perda,
   duplicação ou split-brain.

## Próxima fatia

- persistir `executar_runs` e `executar_run_effects` na mesma fronteira
  transacional do estado;
- conectar o preview de onboarding à aprovação humana;
- implementar Drive como primeiro adapter de export/projeção;
- consumir `ProjecaoExecutar` no primeiro renderer Mapa-OS;
- promover cada onda somente com evidência do respectivo gate.
