# USER MESSAGE · INÍCIO DO DESENVOLVIMENTO

Você é o Codex responsável por assumir o desenvolvimento do repositório `Executar-26/next-forge` e evoluí-lo da PWA atual para o SaaS EXECUTAR.

Antes de escrever qualquer código:

1. leia integralmente `AGENTS.md`;
2. leia integralmente `docs/runner/README.md`;
3. leia integralmente `docs/runner/PLANO_SAAS_4_ONDAS.md`;
4. leia integralmente `docs/runner/RUNNER_CODEX.md`;
5. audite a árvore do starter e o código da PWA em `apps/app/public/legado/sprint-operacional/`;
6. confirme branch, estado do Git, arquivos existentes e ausência de alterações não relacionadas;
7. produza um inventário curto `PRESERVAR / PORTAR / SUBSTITUIR / DESCARTAR` do código atual.

Depois, inicie a **ONDA 1 · FUNDAÇÃO SAAS + PRESERVAÇÃO DO PRODUTO** e siga o runner. Quando provisionamento, secrets, dependências, CI hospedado ou Vercel ainda não estiverem disponíveis, continue a implementação verificável das Ondas 2 e 3 e deixe a integração real para o final.

O Supabase do SaaS deve ser um **projeto novo**, criado somente na etapa final. Nunca selecione nem modifique projetos existentes por suposição.

Objetivo da Onda 1:

- reutilizar o monorepo/chassis SaaS `next-forge` já presente no repositório, sem criar outro starter;
- preservar o Sprint Operacional atual como referência funcional durante a migração;
- configurar Clerk como autoridade de identidade e organizações;
- configurar Supabase para Postgres, RLS, Storage e Realtime;
- criar isolamento multi-tenant comprovado por testes;
- configurar CI bloqueante, observabilidade mínima, segurança de rotas e configuração Vercel;
- deixar a base pronta para portar o produto na Onda 2.

Regras obrigatórias:

- não reescreva visualmente o produto;
- não remova a PWA atual antes de existir equivalência funcional comprovada;
- não desenvolva diretamente na `main`;
- não crie infraestrutura paralela que o starter já resolva;
- não duplique membership/autenticação no Supabase se Clerk já for autoridade;
- não introduza microserviços, CRM, ERP, marketplace ou mobile prematuro; implemente o Copiloto apenas quando avançar explicitamente para a Onda 3;
- não bloqueie todo o trabalho por falta de segredo: crie `.env.example`, validação, mocks quando viável e registre a ação manual necessária;
- mudanças de RLS/autorização devem nascer com testes de isolamento no mesmo PR;
- cada PR deve ter resultado verificável e CI verde antes de merge.

Registre a mudança de onda e diferencie gate de código, integração e produção no relatório canônico do runner:

1. Resultado;
2. Mudanças;
3. Testes;
4. Gate 1 = PASSOU ou NÃO PASSOU;
5. Bloqueios reais;
6. Próximo item PRONTO.

O objetivo não é produzir arquitetura por volume. O objetivo é reduzir tempo de desenvolvimento e chegar rapidamente a uma fundação SaaS real, segura e extensível, preservando o produto que já funciona.
