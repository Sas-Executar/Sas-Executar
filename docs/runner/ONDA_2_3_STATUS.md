# Ondas 2 e 3 · produto e Copiloto sem provisionamento externo

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

## Testes locais

```bash
node --test tests/onda-1/*.test.mjs tests/ondas/*.test.mjs
```

Resultado verificado: **54 testes aprovados; 0 falhas**.

## Gates

- Gate de código de preservação: **PASSOU**.
- Gate de código do produto operacional: **PASSOU**.
- Gate de código do Copiloto determinístico: **PASSOU**.
- Gate de integração da Onda 1: **NÃO PASSOU**; Supabase novo, RLS/Storage reais, CI hospedado e Vercel ainda não foram provisionados/verificados.
- Gate completo da Onda 2: **NÃO PASSOU**; persistência remota, sincronização entre aparelhos e Stripe continuam pendentes.
- Gate completo da Onda 3: **NÃO PASSOU**; modelo real, MCP autenticado e integrações externas continuam pendentes.
- Gate da Onda 4: **NÃO PASSOU**; colaboração real, mobile e produção não foram implementados.

Essas pendências são de integração final; não invalidam os testes de domínio executados localmente. Consulte `INTEGRACAO_FINAL.md`.

