# Onda 3 · Copiloto executor com aprovação humana

> Registro histórico da direção Supabase. A decisão AWS posterior em `INTEGRACAO_FINAL.md` e `infra/aws/` substitui as referências de provedor e os gates externos deste documento.

## Resultado entregue em código

O Copiloto agora opera sobre o mesmo estado canônico, projeto, organização,
fila de dependências e histórico auditável usados pela interface do EXECUTAR.
Não existe um segundo plano, uma fila paralela ou autoridade de tenant fornecida
pelo modelo.

### Planos e entregas

- Cria, seleciona e renomeia projetos sem duplicar estado operacional.
- Importa entregas em JSON, CSV ou Markdown para o projeto ativo.
- Cria e atualiza entregas, predecessores, data, esforço, etapa e critério de
  conclusão; valida identificadores, ciclos e dependências reais.
- Ajusta capacidade diária e limita um plano a 500 entregas.
- Substituição integral de plano e remoção de entrega exigem aprovação humana.

### Foco, progresso e conclusão

- Assume apenas uma entrega efetivamente liberada pela fila canônica.
- Registra progresso e evidência; verificar uma evidência não conclui a entrega.
- `/concluir` e `/fechardia`, quando existe evidência verificada, geram uma
  proposta de aprovação vinculada à organização, ao projeto, à entrega e à
  revisão atual.
- A interface apresenta **Aprovar ação** e **Recusar**; aprovações vencidas,
  divergentes ou adulteradas não são executadas.
- Eventos distinguem ação humana, ação do Copiloto, ferramenta utilizada e
  confirmação humana explícita.

### Replanejamento localizado

- Altera exclusivamente a raiz solicitada e identifica seus sucessores reais.
- Entregas não afetadas permanecem com a mesma referência e os mesmos dados.
- Não replaneja entregas concluídas e rejeita ciclos ou predecessores inválidos.

### Preparação futura para AI SDK e MCP

- Os descritores derivam das ferramentas canônicas, usam `inputSchema` e
  classificam leitura, escrita reversível e ação relevante.
- A porta do agente injeta organização, projeto e revisão autorizados;
  argumentos externos não podem indicar tenant, aprovação ou autoridade.
- A configuração preparada explicita `ToolLoopAgent`, `InferAgentUIMessage`,
  `DefaultChatTransport` e `toUIMessageStreamResponse`.
- Execução futura tem limites de etapas, chamadas, tamanho de entrada e volume
  de entregas.
- O manifesto preparado para MCP declara autoridade `clerk-organization`.
- Modelo e provedor permanecem `null`; nenhuma dependência, segredo, servidor
  MCP ou integração remota foi instalada ou configurada nesta etapa.

## Exemplos operacionais

```text
criar plano Lançamento Nordeste
/entrega criar A-01 | Preparar publicação | Operações | 24/08 | 30 | | 1 | Publicação validada
/entrega atualizar A-01 data=25/08 | minutos=45
/foco A-01
/progresso
/evidencia verificar Publicação revisada e aprovada
/concluir A-01
/replanejamento A-01 data=26/08
```

## Verificação local

```bash
node --test tests/onda-1/*.test.mjs tests/ondas/*.test.mjs
node --check apps/app/lib/executar/domain.ts
node --check apps/app/lib/executar/agent-contract.ts
```

Resultado: **153 testes aprovados; 0 falhas**, incluindo **52 testes
específicos da Onda 3**. A verificação inclui fluxo completo de criação de
projeto, entregas dependentes, foco, progresso, evidência e conclusão aprovada.

## Gates e limites reais

- Gate de código da Onda 3: **PASSOU**.
- Gate de integração da Onda 3: **NÃO PASSOU**: modelo real, execução AI SDK,
  chat em streaming, MCP autenticado e aprovação autenticada no servidor ainda
  não foram integrados nem verificados.
- Typecheck completo do monorepo, build, instalação de dependências, serviços
  externos, CI hospedado e deployment Vercel permanecem para a integração final.
- Supabase será obrigatoriamente um projeto novo; não existe validação real de
  RLS, Storage ou Realtime até esse provisionamento.

Consulte `INTEGRACAO_FINAL.md` antes de qualquer declaração de prontidão para
produção.
