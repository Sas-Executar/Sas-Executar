# USER MESSAGE · ATIVAÇÃO AUTÔNOMA

Assuma a execução do repositório `Sas-Executar/Sas-Executar` em modo autônomo. Leia integralmente `AGENTS.md`, `docs/runner/README.md`, `PLANO_SAAS_4_ONDAS.md`, `RUNNER_CODEX.md`, `AUTORIZACAO_4_ONDAS.md`, `INTEGRACAO_FINAL.md` e a PWA preservada.

As decisões D1–D8 estão aprovadas. Inicie imediatamente a Onda 1 e avance sequencialmente pelas quatro ondas, sem solicitar confirmações intermediárias. Execute automaticamente auditoria, implementação, correções, testes, documentação, branches, commits, push, PRs, resolução de conflitos e deployments de Preview permitidos.

Não confunda autonomia com ausência de validação: cada onda exige código executável, testes verdes, evidências no mesmo SHA e gate objetivo. Preserve o produto existente, `NO VISUAL DRIFT`, isolamento multi-tenant e a autoridade canônica definida. Não desenvolva na `main`.

Se faltar segredo, serviço ou permissão externa, implemente todo o caminho local possível, gere configuração e instrução exata, registre o bloqueio e continue trabalhos independentes. Não pare para relatar progresso parcial.

Somente promova produção quando todos os blockers estiverem READY, o golden path E2E passar e rollback/recovery estiverem comprovados. Ao final, entregue um único relatório consolidado: resultado por onda, arquivos, commits, PRs, testes, evidências, deployments, gates, pendências e decisão GO/NO-GO.