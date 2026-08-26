# Onda 4 · colaboração, distribuição e preparo mobile

> Registro histórico da direção Supabase. A decisão AWS posterior em `INTEGRACAO_FINAL.md` e `infra/aws/` substitui as referências de provedor e os gates externos deste documento.

## Resultado entregue em código

A aplicação autenticada passa a usar o usuário e a organização ativos do Clerk
para apresentar colaboração operacional, presença por projeto, comentários,
menções validadas, notificações e onboarding sem criar um segundo plano ou um
cadastro paralelo de membros.

### Colaboração e isolamento

- O estado canônico inclui presença, comentários e confirmações de leitura;
  snapshots antigos migram sem perder foco, progresso ou evidência.
- Dados contaminados com outra organização ou projeto desconhecido são
  descartados ao restaurar o estado.
- Cada comentário pertence a organização, projeto, entrega e usuário Clerk.
- Menções precisam constar em diretório autorizado da mesma organização.
- Presença expira em 120 segundos e não representa conexão remota verificada.
- O provider `@repo/collaboration` existente é habilitado somente quando
  `LIVEBLOCKS_SECRET` existe; sua sala usa `clerk_org_id:project_id`.
- A busca de menções do starter foi corrigida para retornar o `userId` do Clerk,
  não o identificador do membership.
- Eventos colaborativos registram usuário, revisão e impressão da alteração para
  distinguir atualizações concorrentes.

### Notificações e estado compartilhado

- Avisos de menção, comentário em foco, entrega concluída, entrega liberada e
  replanejamento são derivados dos comentários/eventos canônicos.
- Não existe fila de notificações duplicando o plano operacional.
- Leituras são isoladas por organização, projeto e usuário; repetição é
  idempotente.
- Abas do mesmo navegador recebem atualizações pela chave versionada da
  organização; alterações divergentes geram conflito explícito e preservam o
  estado local.
- `@repo/notifications` e seu provider Knock existentes só são ativados quando
  as chaves públicas e o canal estão configurados.

### Mobile e PWA

- `apps/mobile` agora contém a fundação Expo SDK 57 para Android e iOS, sem
  migrar ou substituir `apps/app`.
- Tamagui compõe a superfície compartilhável; seletores e ação central usam
  `@expo/ui/swift-ui` no iOS com fallback Android explícito.
- A projeção mobile reutiliza foco, fila, calendário e evidência do mesmo
  estado; arquivos são reduzidos a metadados, sem divulgar bytes/base64.
- `GET /api/executar/mobile` expõe essa projeção somente após autenticação Clerk
  e a valida com `@repo/executar-contracts` nos dois lados da rede.
- O scaffold permanece somente leitura. Escritas, distribuição EAS e submissão
  às lojas continuam bloqueadas até aprovação da web, sincronização remota,
  isolamento real e sessão móvel.
- Takeout não é dependência nem substituto do backend; é apenas referência de
  arquitetura/starter.
- A PWA original permanece intacta e instalável no escopo legado existente.

### GTM sem alegações indevidas

- `apps/web` agora apresenta a proposta EXECUTAR em português, com foco,
  dependências, evidências, Copiloto e CTA para o aplicativo existente.
- O starter genérico não exibe métricas fictícias, testemunhos inventados ou
  preço `$40 / month`.
- A página de disponibilidade distingue código existente das integrações finais
  e informa que preços/cobrança ainda dependem de definição e Stripe real.
- Cabeçalho, rodapé e o pacote compartilhado `@repo/seo` apresentam a marca
  EXECUTAR, sem atribuição fictícia à Vercel; o idioma HTML acompanha a rota.

## GitHub Actions autorizado, execução ainda bloqueada

A autorização permitiu reenviar a execução `32526836177` com sucesso pela API.
Na segunda tentativa, porém, o job de preservação terminou em `failure` com
**zero steps**, enquanto instalação/typecheck/build ficaram `skipped`. A tentativa
de recuperar logs retornou `404 BlobNotFound`, evidenciando que não houve log de
step disponível.

Portanto, autorização para reexecutar workflow não equivale a runner funcional.
A causa administrativa exata não pôde ser comprovada pelos endpoints disponíveis;
verificar permissões/disponibilidade dos runners, políticas e cobrança da conta
antes de atribuir o erro ao código da aplicação.

## Verificação local

```bash
node --test tests/onda-1/*.test.mjs tests/ondas/*.test.mjs
node --test tests/ondas/onda-4.test.mjs
node --check apps/app/lib/executar/domain.ts
node --check apps/app/lib/executar/distribution.ts
node --check apps/app/lib/executar/agent-contract.ts
```

Resultado local: **202 testes aprovados, 0 falhas**, incluindo **49 testes
específicos da Onda 4**.

## Gates reais

- Código da Onda 4 · colaboração, avisos, marketing e contratos: **PASSOU**.
- Colaboração Liveblocks entre usuários reais: **NÃO VERIFICADO**.
- Entrega Knock em canal externo: **NÃO VERIFICADO**.
- Scaffold Android/iOS: **IMPLEMENTADO EM CÓDIGO**, sem build nativo comprovado.
- Sessão real, escritas, EAS e lojas: **NÃO PASSOU**, bloqueados por
  predecessores e verificações reais.
- GitHub Actions hospedado: **NÃO PASSOU**, sem steps e sem logs de execução.
- Vercel, Supabase novo, RLS, Storage, Stripe e produção: **NÃO PASSOU**;
  permanecem no checklist de integração final.

Não declarar lançamento, produção, colaboração remota ou aplicativo móvel
concluídos com base exclusivamente nos testes locais.
