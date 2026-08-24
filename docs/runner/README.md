# Runner Codex · Sprint Operacional

Este diretório contém o handoff canônico para evoluir a PWA atual do `Sprint-Operacional` até uma base SaaS completa, sem ruptura desnecessária de produto.

## Repositório canônico e legado

- Repositório canônico: `Sas-Executar/Sas-Executar`.
- Origem histórica da PWA: `Executar-26/Sprint-Operacional`.
- Código preservado: `apps/app/public/legado/sprint-operacional/`.
- Rota executável: `/legado/sprint-operacional/`.
- Inventário de migração: `INVENTARIO_LEGADO.md`.
- Fundação existente: o starter `next-forge` já está presente; adapte-o sem duplicação.
- Provisionamento canônico: AWS em `sa-east-1`, declarado em `infra/aws/` e aplicado por `.github/workflows/aws-infra.yml`.
- Checklist de deploy, secrets, dependências, CI e serviços reais: `INTEGRACAO_FINAL.md`.
- Status detalhado do produto editável e persistência local-first: `ONDA_2_STATUS.md`.
- Status detalhado do Copiloto executor, aprovações e preparação AI SDK/MCP: `ONDA_3_STATUS.md`.
- Status detalhado de colaboração, avisos, GTM e bloqueios mobile/Actions: `ONDA_4_STATUS.md`.
- Fechamento adicional histórico das quatro ondas e do experimento Supabase: `ONDA_5_FECHAMENTO.md`; a decisão AWS posterior o substitui como direção de infraestrutura.
- Trilha Agent-007 (Gate 0 + três ondas internas ao Copiloto): `../agent-007/README.md`.

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

A decisão vigente preserva Clerk e substitui o runtime Supabase por Aurora PostgreSQL privado via RDS Data API, S3 e IAM/OIDC. Artefatos Supabase continuam no repositório apenas para auditoria da migração e não definem novos provisionamentos.

A Onda 5 é uma etapa adicional de fechamento autorizada posteriormente. Ela não
substitui o plano canônico de quatro ondas nem autoriza automaticamente o
provisionamento externo reservado à integração final.
