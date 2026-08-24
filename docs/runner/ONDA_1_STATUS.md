# Onda 1 · estado da fundação e configuração manual

> Registro histórico da direção Supabase. A decisão AWS posterior em `INTEGRACAO_FINAL.md` e `infra/aws/` substitui as referências de provedor e os gates externos deste documento.

## Fundação existente

O repositório `Sas-Executar/Sas-Executar` já contém o starter `next-forge` 6.0.2 com:

- `apps/app`, `apps/web` e `apps/api`.
- Clerk em `packages/auth`, incluindo organizações no seletor existente.
- Prisma em `packages/database`.
- Storage em `packages/storage`.
- Observabilidade em `packages/observability`.
- Headers/segurança em `packages/security`.
- Rate limiting em `packages/rate-limit`.

## Adaptações obrigatórias ainda não concluídas

1. Criar um **projeto Supabase novo e dedicado ao EXECUTAR** somente na integração final; projetos existentes não serão reutilizados.
2. Configurar Clerk como autenticação de terceiros nesse projeto Supabase novo.
3. Adaptar `packages/database` de Neon para Supabase Postgres sem introduzir Supabase Auth.
4. Adaptar `packages/storage` de Vercel Blob para Supabase Storage.
5. Criar organização local vinculada ao `clerk_org_id`, recursos com `organization_id`, RLS e políticas de Storage.
6. Cobrir SELECT, INSERT, UPDATE e DELETE entre organizações distintas no mesmo PR da autorização.
7. Vincular o projeto Vercel correto à raiz `apps/app` e configurar variáveis.

Esses itens bloqueiam integração/produção, mas não bloqueiam a implementação localmente verificável das Ondas 2 e 3. O checklist operacional está em `INTEGRACAO_FINAL.md`.

## Variáveis exigidas

Sem valores reais no repositório:

```env
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

A chave secreta/service-role nunca pode ser exposta em variáveis `NEXT_PUBLIC_` nem usada como substituta das políticas RLS.

## Organização ativa

As políticas RLS devem reconhecer os formatos Clerk atuais e legados:

```sql
coalesce(
  auth.jwt() -> 'o' ->> 'id',
  auth.jwt() ->> 'org_id'
)
```

O membership continua sob autoridade do Clerk; não criar tabela paralela de membros para substituir Clerk Organizations.

## Critério de parada

A presença de arquivos, um starter importado ou um PR aberto não equivale a login funcional, banco aplicado, RLS verificado, Storage isolado ou deploy aprovado. O gate de código pode avançar com testes locais; o gate de integração da Onda 1 somente passa com evidência real desses estados.
