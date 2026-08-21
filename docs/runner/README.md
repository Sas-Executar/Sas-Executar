# Runner Codex · Sprint Operacional

Este diretório contém o handoff canônico para evoluir a PWA atual do `Sprint-Operacional` até uma base SaaS completa, sem ruptura desnecessária de produto.

## Repositório canônico e legado

- Repositório canônico: `Executar-26/next-forge`.
- Origem histórica da PWA: `Executar-26/Sprint-Operacional`.
- Código preservado: `apps/app/public/legado/sprint-operacional/`.
- Rota executável: `/legado/sprint-operacional/`.
- Inventário de migração: `INVENTARIO_LEGADO.md`.
- Fundação existente: o starter `next-forge` já está presente; adapte-o sem duplicação.
- Provisionamento: o Supabase do SaaS será um projeto novo, criado somente na integração final.
- Checklist de deploy, secrets, dependências, CI e serviços reais: `INTEGRACAO_FINAL.md`.

## Ordem de leitura

1. `PLANO_SAAS_4_ONDAS.md` — plano executivo consolidado.
2. `RUNNER_CODEX.md` — contrato operacional do agente que executará o plano.
3. `USER_MESSAGE_CODEX.md` — mensagem única para iniciar o desenvolvimento.

## Objetivo do produto

Evoluir o Sprint Operacional para um SaaS de gestão visual de projetos e processos pessoais/equipes, preservando a experiência atual e habilitando gradualmente:

- multi-tenant;
- autenticação e organizações;
- persistência e sincronização;
- arquivos/evidências;
- colaboração;
- cobrança;
- Copiloto em chat com agente ponta a ponta;
- Vercel AI SDK;
- skills;
- MCP/tools;
- planejamento, execução, replanejamento e registro assistidos por IA;
- API compartilhada;
- Android e iOS via Expo;
- módulos futuros de CRM, operação/ERP mínimo e marketplace sem criar produtos paralelos.

## Regra de continuidade

A PWA atual é a referência funcional de UX e lógica operacional. Antes de substituir qualquer fluxo, o sucessor deve reproduzir e testar o comportamento correspondente.

A falta de serviços externos não bloqueia a implementação verificável do produto e do Copiloto. Gates de código local, integração real e produção devem ser reportados separadamente.
