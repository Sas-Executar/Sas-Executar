# Ondas 2 e 3 · produto e Copiloto sem provisionamento externo

> Registro histórico da direção Supabase. A decisão AWS posterior em `INTEGRACAO_FINAL.md` e `infra/aws/` substitui as referências de provedor e os gates externos deste documento.

## Código entregue

- A página autenticada `apps/app` apresenta o produto EXECUTAR sem consultar um banco indisponível.
- Clerk continua responsável por autenticação, organização ativa e troca de organização.
- As 33 entregas da PWA preservada são importadas como seed tipada sem alterar títulos, datas, esforço ou dependências.
- Visão geral, Foco, Calendário, ciclos de 72 horas, Caminho e evidências foram portados para componentes React usando o CSS legado.
- A fila mostra somente entregas liberadas; foco crítico é limitado a uma entrega.
- Conclusão exige dependências atendidas, evidência presente e confirmação explícita de verificação.
- Estado local é versionado por organização; um snapshot de outra organização é rejeitado.
- Alterações relevantes geram eventos auditáveis vinculados à organização.
- O Copiloto interpreta `/bomdia`, `/agora`, `/estado`, `/fechardia`, `/replanejamento`, `/mapa`, `/evidencia` e `/bloqueio`.
- O Copiloto consulta o mesmo estado do produto; não mantém uma fila operacional paralela.
- Ferramentas locais distinguem leitura, escrita reversível e conclusão relevante com aprovação humana.
- A sincronização futura deriva eventos do estado canônico e rejeita tenant divergente.
- A Onda 2 agora inclui projetos múltiplos, CRUD de entregas, importação/exportação e calendário dinâmico; consulte `ONDA_2_STATUS.md`.
- A Onda 3 agora cria e atualiza planos, assume foco, registra progresso e evidência, solicita aprovação humana e replaneja somente o subgrafo afetado; consulte `ONDA_3_STATUS.md`.
- Aprovações são vinculadas a organização, projeto, entrega e revisão; envelopes adulterados ou vencidos são recusados.
- Contratos preparados para AI SDK e MCP usam `inputSchema`, autoridade do Clerk e limites de execução, sem escolher modelo ou provedor.
- A Onda 4 adiciona colaboração isolada, notificações derivadas, provedores Liveblocks/Knock opcionais, marketing EXECUTAR e preparo Expo bloqueado pelos gates web; consulte `ONDA_4_STATUS.md`.
- A Onda 5 adiciona fechamento auditável, contratos Clerk/Supabase, template SQL/RLS/Storage e uma matriz executável de dependências; consulte `ONDA_5_FECHAMENTO.md`.

## Testes locais

```bash
node --test tests/onda-1/*.test.mjs tests/ondas/*.test.mjs
```

Resultado verificado após a Onda 5: **269 testes aprovados; 0 falhas**.

## Gates

- Gate de código de preservação: **PASSOU**.
- Gate de código do produto operacional: **PASSOU**.
- Gate de código do Copiloto executor e aprovação humana: **PASSOU**.
- Gate de código de colaboração, notificações e GTM: **PASSOU**.
- Gate de código do fechamento, dos contratos de integração e do template SQL: **PASSOU** quando validado pela suíte local.
- Gate de integração da Onda 1: **NÃO PASSOU**; Supabase novo, RLS/Storage reais, CI hospedado e Vercel ainda não foram provisionados/verificados.
- Gate completo da Onda 2: **NÃO PASSOU**; persistência remota, sincronização entre aparelhos e Stripe continuam pendentes.
- Gate completo da Onda 3: **NÃO PASSOU**; modelo real, AI SDK em execução, MCP autenticado e aprovação validada no servidor continuam pendentes.
- Gate completo da Onda 4: **NÃO PASSOU**; colaboração externa real, builds mobile, cobrança, runner GitHub e produção não foram verificados.

Essas pendências são de integração final; não invalidam os testes de domínio executados localmente. Consulte `INTEGRACAO_FINAL.md`.
