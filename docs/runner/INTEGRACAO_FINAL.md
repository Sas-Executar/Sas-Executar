# Integração final · provisionamento e produção

## Política de execução

O desenvolvimento do produto, do domínio e do Copiloto pode avançar com adaptadores locais e testes sem serviços externos. A falta de projeto Supabase, secrets, instalação de dependências, CI hospedado ou deployment Vercel não bloqueia a implementação verificável localmente.

Essas pendências continuam bloqueando produção, sincronização em nuvem e qualquer declaração de gate de integração aprovado.

## Supabase: projeto obrigatoriamente novo

1. Criar um **novo projeto Supabase dedicado ao SaaS EXECUTAR** quando começar a integração final.
2. Não reutilizar, alterar ou inferir projetos Supabase existentes.
3. Configurar Clerk como autoridade de identidade, organizações, memberships e sessões.
4. Integrar Clerk como autenticação de terceiros no projeto Supabase novo.
5. Adaptar os pacotes existentes `packages/database` e `packages/storage`; não criar um segundo starter.
6. Aplicar Postgres, RLS, Storage e Realtime com vínculo ao `clerk_org_id`.
7. Executar testes reais de SELECT, INSERT, UPDATE, DELETE e Storage entre organizações distintas.
8. Só então conectar o estado local-first do produto ao repositório remoto.

## Demais itens da integração final

- Configurar secrets e variáveis de ambiente no projeto Vercel correto.
- Sincronizar e instalar dependências sem duplicar infraestrutura existente.
- Corrigir a execução de GitHub Actions e obter CI verde.
- Validar login, organizações e tenant ativo com Clerk real.
- Validar sincronização entre aparelhos e recuperação offline.
- Conectar provedor de IA real somente após validar o Copiloto determinístico.
- Conectar notificações, colaboração e cobrança quando houver um caso funcional verificável.
- Executar build, deployment, smoke tests e observabilidade na Vercel.
- Preservar o PR em draft enquanto os checks externos obrigatórios não passarem.

## Gates

- **Gate de código:** domínio, interface, dependências, evidências, isolamento local e Copiloto aprovados por testes locais.
- **Gate de integração:** Supabase novo, RLS/Storage, Clerk real, CI e deployment verificados com serviços reais.
- **Gate de produção:** integração aprovada, segurança, disponibilidade, custo e experiência final demonstrados.

A aprovação de um gate de código nunca implica aprovação automática de integração ou produção.

