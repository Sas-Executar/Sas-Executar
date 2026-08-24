# Matriz de validação ponta a ponta

A fonte executável desta matriz é `e2e-matrix.json`. O CI valida IDs, cobertura
das fronteiras, vínculo dos gaps P0 e estado inicial dos cenários.

| ID | Onda | Prioridade | Cenário | Resultado esperado resumido |
|---|---:|---|---|---|
| E2E-01 | 2 | P0 | Primeiro uso sem Drive/Linear | setup, execução e projeção usam a autoridade canônica |
| E2E-02 | 2 | P1 | Migração CSV/documento | preview e rejeições aparecem antes da escrita |
| E2E-03 | 2 | P0 | Drive + Linear existentes | bindings sem duplicação ou troca de autoridade |
| E2E-04 | 1 | P0 | `/situacao` | alias somente leitura derivado do estado real |
| E2E-05 | 2 | P0 | `/bomdia` | próximo passo/tempo/DoD/evidência persistidos |
| E2E-06 | 1 | P0 | conclusão inválida | `DONE` bloqueado pela política completa |
| E2E-07 | 1 | P0 | sucessor liberado | promoção única após conclusão válida |
| E2E-08 | 1 | P0 | replay | zero efeito duplicado |
| E2E-09 | 2 | P0 | falha Drive | run recuperável, sem sucesso parcial |
| E2E-10 | 2 | P1 | falha Linear | estado degradado, revisão canônica preservada |
| E2E-11 | 3 | P0 | emissão Mapa-OS | projeção, offline, print e QR validados |
| E2E-12 | 3 | P0 | privacidade | sem raciocínio privado, credenciais ou bytes |

## Fronteiras obrigatórias

O conjunto da suíte precisa observar:

`identity → authority → command → read → state → action → write → evidence → projection`.

Cada execução real deve registrar entrada sanitizada, `run_id`, operações,
revisões, efeitos, resultado e evidência do veredito. Estados aceitos:
`PASS`, `PARTIAL`, `FAIL` e `OBSERVATION`; antes da implementação, o cenário
permanece `PLANNED`.

## Gate para o piloto

- todos os cenários P0 em `PASS`;
- nenhum P1 em `FAIL` sem aceite de risco explícito;
- zero violação de tenant, duplicação ou transição inválida;
- falhas externas demonstradas como recuperáveis;
- render/print/QR verificados no artefato final.
