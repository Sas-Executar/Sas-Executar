# Plano de desenvolvimento · Agent-007

**Versão:** 0.1.0
**Base auditada:** commit `7a3086c` e handoff de 24/08/2026
**Estratégia:** Gate 0 + três ondas internas ao plano SaaS de quatro ondas

## 1. Decisão executiva

O repositório já implementa mais do núcleo do que o pacote de handoff isolado
permitia concluir: há estado único por organização, grafo validado, foco,
evidência, revisão otimista, eventos, aprovação humana, persistência AWS,
ferramentas AI SDK/MCP e testes multi-tenant. Portanto, este plano não recria o
core. Ele fecha as diferenças entre o protocolo Agent-007 e o produto atual.

A UI não será ampliada antes da aprovação do Gate 0 e do fechamento dos itens
P0 da Onda Agent-007 1.

## 2. Arquitetura de referência

```text
Clerk (identidade/tenant)
          |
          v
Comando -> Orquestrador/Agent -> executar-core -> Aurora/S3
                                    |              |
                                    |              +-> eventos/evidências
                                    v
                            projection-service
                                    |
                                    v
                     App / Mapa-OS / documentos

Drive e Linear = adaptadores autorizados, não autoridades concorrentes.
```

O chassis continua sendo o monorepo next-forge atual. O domínio permanece em
`apps/app/lib/executar`; extrações para `packages/*` só ocorrem quando houver um
segundo consumidor real.

## 3. Auditoria dos 22 gaps

Estados usados nesta auditoria:

- `IMPLEMENTADO`: existe no runtime e possui teste relevante;
- `PARCIAL`: parte existe, mas o critério completo não foi provado;
- `ABERTO`: não há contrato/implementação suficiente;
- `PROPOSTO`: este Gate 0 adiciona o contrato, ainda sujeito à revisão.

| ID | Prioridade | Estado | Evidência no repositório e próxima decisão |
|---|---|---|---|
| GAP-001 | P0 | PARCIAL | `concluirEntrega` exige evidência verificada e o Copiloto exige aprovação; falta tornar DoD obrigatório/satisfeito por política explícita. |
| GAP-002 | P0 | PARCIAL | Plano SaaS trava AWS como autoridade; falta formalizar Drive/Linear por campo e conflito. ADR-001 propõe a decisão. |
| GAP-003 | P0 | PARCIAL | Há modelo TypeScript, tabelas/RLS e payload transacional; `TODAY`, `QUEUE`, `BLOCKERS`, rotinas e projeções ainda não têm contratos físicos únicos. |
| GAP-004 | P0 | PARCIAL | O roteador cobre os comandos atuais; `/situacao` ainda não é alias formal de `/estado`. |
| GAP-005 | P0 | PROPOSTO | `projection-contract.v1.schema.json` passa a definir a fronteira estado → renderer; integração produtiva ainda falta. |
| GAP-006 | P0 | PARCIAL | Revisão, `operationIds`, conflito otimista e fingerprints existem; faltam `run_id`, lock, replay e ledger de efeitos da rotina. |
| GAP-007 | P0 | IMPLEMENTADO | Dependências são IDs tipados, grafo é validado e persistência usa arestas relacionais. |
| GAP-008 | P0 | PROPOSTO | Este PRD guarda-chuva cobre Copiloto, conectores, rotina, projeção e validação. |
| GAP-009 | P1 | ABERTO | Não há onboarding completo pelos quatro modos de intenção. |
| GAP-010 | P1 | PARCIAL | Importação JSON/Markdown/CSV existe no domínio; faltam descoberta, preview, aprovação e relatório de rejeições. |
| GAP-011 | P1 | ABERTO | Ainda não há manifesto mínimo/cache/paginação para ativar um pacote ou fonte grande. |
| GAP-012 | P1 | PARCIAL | A UI e respostas usam pt-BR; códigos técnicos ainda vazam em superfícies e erros. |
| GAP-013 | P1 | PARCIAL | `/bomdia` e `/fechardia` existem; rollover, scheduler, lock e reexecução observável não. |
| GAP-014 | P1 | ABERTO | Scripts do handoff são artefatos de sessão e não foram incorporados como comandos parametrizados. |
| GAP-015 | P1 | ABERTO | Não há adaptador Drive com chave lógica e update in-place. |
| GAP-016 | P1 | PARCIAL | Eventos versionados por mutação existem; falta ledger atômico de run, tool call, efeito externo e resultado. |
| GAP-017 | P1 | PROPOSTO | `SOURCE_PROVENANCE.md` proíbe traces brutos/raciocínio privado; enforcement automatizado ainda falta. |
| GAP-018 | P2 | ABERTO | Artefatos do renderer ainda não têm gate offline completo. |
| GAP-019 | P2 | ABERTO | Falta contrato/teste de `print-color-adjust: exact`. |
| GAP-020 | P2 | ABERTO | Falta geração de QR por binding e teste de decode no tamanho final. |
| GAP-021 | P2 | ABERTO | Falta registry determinístico de templates, versões, slots e placeholders. |
| GAP-022 | P2 | ABERTO | Falta formalizar precedência tokens globais → variante → override auditado. |

Resumo na abertura do Gate 0: **1 implementado, 9 parciais, 3 propostos e 9
abertos**. Um item `PROPOSTO` só vira `IMPLEMENTADO` após merge e uso pelo
runtime quando aplicável.

## 4. Backlog priorizado

| Ordem | Épico | Onda | Prioridade | Dependências | Critério principal |
|---:|---|---:|---|---|---|
| 1 | G0-001 Aprovar PRD e ADR | Gate 0 | P0 | — | decisão humana registrada |
| 2 | G0-002 Aprovar state/projection contracts | Gate 0 | P0 | 1 | schemas versionados e testados |
| 3 | CORE-001 Política completa de conclusão | 1 | P0 | 2 | nenhum DONE sem DoD/evidência/verificação/aprovação |
| 4 | CORE-002 Catálogo único e `/situacao` | 1 | P0 | 2 | comandos e aliases derivados de uma fonte |
| 5 | RUN-001 Run ledger, lock e replay | 1 | P0 | 2 | mesma chave não duplica efeitos |
| 6 | CORE-003 Schemas físicos derivados | 1 | P0 | 2 | queue/blockers/today não são editáveis |
| 7 | VAL-001 Harness de contratos | 1 | P0 | 3–6 | fixtures críticas executam no CI |
| 8 | ONB-001 Onboarding por intenção | 2 | P1 | 7 | quatro modos completam sem termos internos |
| 9 | IMP-001 Importação com preview | 2 | P1 | 7–8 | conflitos/rejeições antes da escrita |
| 10 | AUTH-001 Registry de bindings | 2 | P1 | 5, 8 | nenhuma escrita sem autoridade resolvida |
| 11 | CON-001 Drive adapter | 2 | P1 | 10 | paginação, update seguro e falha recuperável |
| 12 | CON-002 Linear adapter | 2 | P1 | 10 | sem split-brain e com reconciliação explícita |
| 13 | ROT-001 Rollover e `/bomdia` | 2 | P1 | 5, 10–12 | manual/agendado/replay produzem mesmo estado |
| 14 | PROJ-001 Projection service | 3 | P0 | 2, 7 | renderer recebe somente schema válido |
| 15 | DES-001 Renderer + registry Mapa-OS | 3 | P1 | 14 | templates determinísticos sem estado |
| 16 | PRINT-001 Offline, print e QR | 3 | P2 | 15 | render/print/decode automatizados |
| 17 | E2E-001 Jornada completa | 3 | P0 | 8–16 | cenários P0 em PASS |
| 18 | REL-001 Piloto de sete dias | 3 | P0 | 17 | zero perda, duplicação ou transição inválida |

## 5. Gate 0

### Entregáveis

- PRD guarda-chuva;
- ADR de autoridade e sincronização;
- state contract v2 proposto;
- projection contract v1 proposto;
- política de dados/proveniência;
- matriz de 12 cenários E2E;
- teste de governança executado pelo workflow existente.

### Saída

`PASSOU` somente após revisão humana dos contratos e CI verde. Até lá:

- UI ampla: bloqueada;
- Onda 1: pode ser refinada em issues, mas mudanças de regra aguardam aceite;
- Onda 2/3: apenas desenho e dependências, sem implementação prematura.

## 6. Onda Agent-007 1 · Núcleo confiável

Objetivo: fechar as diferenças determinísticas no domínio existente.

Trabalho:

1. política de conclusão por projeto e migração de entregas sem DoD;
2. catálogo único de comandos e alias `/situacao`;
3. `run_id`, idempotency key, locks, efeitos e replay;
4. schemas físicos para rotinas e projeções derivadas;
5. testes de estado, tenant, concorrência, aprovação e repetição;
6. telemetria sanitizada correlacionada ao run.

Gate da onda:

- 100% das transições inválidas bloqueadas;
- `DONE` exige a política completa;
- replay não duplica escrita/evento;
- todos os comandos possuem contrato e teste;
- nenhuma regressão no legado ou no isolamento multi-tenant.

## 7. Onda Agent-007 2 · Onboarding, conectores e rotina

Objetivo: permitir operação sem conhecimento da arquitetura.

Trabalho:

1. onboarding nos quatro modos;
2. importação com preview, confirmação e rejeições;
3. registry de autoridade/bindings;
4. Drive e Linear como adaptadores autorizados;
5. leitura paginada/cache por hash;
6. rollover e `/bomdia` manual/agendado;
7. linguagem pt-BR orientada à ação e falha recuperável.

Gate da onda:

- nenhuma escrita antes do preflight de autoridade;
- conectores indisponíveis não produzem sucesso parcial silencioso;
- setup e migração não exigem IDs técnicos;
- `/bomdia` usa somente estado persistido/derivado;
- rotina repetida é idempotente.

## 8. Onda Agent-007 3 · Projeção, E2E e piloto

Objetivo: provar a jornada completa e preparar o lançamento.

Trabalho:

1. projection service validado;
2. renderer App/Mapa-OS/Prisma/Workbook/Showroom;
3. registry de templates e precedência de tokens;
4. pipeline offline, print e QR;
5. dataset sanitizado e avaliador;
6. E2E completo com falhas de conector e replay;
7. runbooks, rollback e piloto acompanhado de sete dias.

Gate da onda:

- renderer sem acesso de escrita ao estado;
- artefatos offline, impressão fiel e QR decodificável;
- todos os cenários críticos em `PASS`;
- sete dias sem perda silenciosa, duplicação ou split-brain;
- todo incidente rastreável por `run_id`.

## 9. Critérios de lançamento

1. Gate 0 e três ondas aprovados;
2. contratos P0 versionados e consumidos pelo runtime;
3. isolamento multi-tenant e aprovação humana preservados;
4. conclusão, rotina e conectores testados sob falha/replay;
5. projeções não possuem estado nem bytes privados;
6. observabilidade e recuperação comprovadas;
7. piloto de sete dias concluído.
