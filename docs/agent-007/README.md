# Agent-007 · Gate 0

Esta pasta inicia a trilha de desenvolvimento do Copiloto EXECUTAR no
repositório canônico `Sas-Executar/Sas-Executar`.

O Agent-007 não cria um produto, banco ou monorepo paralelo. Ele evolui o
domínio existente em `apps/app/lib/executar`, preserva a PWA em
`apps/app/public/legado/sprint-operacional` e respeita as quatro ondas do plano
SaaS vigente. As três ondas abaixo são uma trilha interna ao Copiloto:

1. Gate 0: PRD, autoridade, state contract, projection contract e matriz E2E;
2. Onda Agent-007 1: núcleo determinístico, evidências, estados, idempotência e
   testes;
3. Onda Agent-007 2: onboarding, importação, Drive/Linear, rollover e
   `/bomdia`;
4. Onda Agent-007 3: Mapa-OS, renderer, QR/print, E2E e piloto de sete dias.

## Artefatos do Gate 0

- [PRD guarda-chuva](./PRD_AGENT_007.md)
- [Plano, 22 gaps e backlog](./PLANO_DESENVOLVIMENTO.md)
- [ADR de autoridade e sincronização](./ADR_001_AUTORIDADE_DADOS.md)
- [State contract v2](./contracts/state-contract.v2.schema.json)
- [Projection contract v1](./contracts/projection-contract.v1.schema.json)
- [Matriz E2E](./validation/E2E_MATRIX.md)
- [Matriz E2E executável](./validation/e2e-matrix.json)
- [Proveniência e política de ingestão](./SOURCE_PROVENANCE.md)
- [Manifesto verificável do Gate 0](./gate-0-manifest.json)

## Estado do gate

`EM REVISÃO`.

Os documentos e contratos estão propostos e têm testes de consistência no CI.
O gate só muda para `PASSOU` depois de revisão humana do PR e aceite explícito
das decisões de autoridade, conclusão e projeção. Até lá, não ampliar a UI nem
iniciar o renderer.
