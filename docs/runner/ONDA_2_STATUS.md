# Onda 2 · produto operacional local-first

> Registro histórico da direção Supabase. A decisão AWS posterior em `INTEGRACAO_FINAL.md` e `infra/aws/` substitui as referências de provedor e os gates externos deste documento.

## Resultado entregue

O `apps/app` deixa de ser somente uma reprodução estática do sprint original e passa a operar projetos, entregas e dependências editáveis dentro de um único estado canônico por organização Clerk.

## Projetos e entregas

- Sprint inicial criado a partir das mesmas 33 entregas da PWA preservada.
- Criação, seleção e renomeação de projetos na organização ativa.
- Troca de projeto preserva individualmente foco, conclusões, passos e evidências.
- O projeto ativo não mantém snapshot duplicado.
- Criação, edição e remoção segura de entregas.
- Remoção bloqueada para entregas concluídas, com evidências ou com sucessores.
- Dependências inexistentes, repetidas ou cíclicas são rejeitadas antes de alterar o plano.
- Alterações de dependência recalculam filas e foco sem liberar trabalho bloqueado.

## Importação, exportação e evidências

- Importação atômica de JSON, CSV e listas Markdown.
- Campos em português e em inglês são reconhecidos.
- Exportações identificadas com outra organização são rejeitadas.
- Exportação JSON inclui projeto, entregas, progresso e evidências.
- A substituição de um plano existente é bloqueada quando há conclusões ou evidências.
- Evidências aceitam texto, ligação HTTP(S) ou arquivo local de até 2,5 MB.
- Conclusão continua exigindo evidência verificável e confirmação explícita.

## Calendário, capacidade e caminho crítico

- Datas operacionais são derivadas das entregas reais do projeto ativo.
- Capacidade diária configurável entre 15 e 1.440 minutos.
- Sobrecarga diária é calculada e indicada no calendário.
- Ciclos são agrupados por três dias operacionais.
- Caminho crítico é calculado diretamente do grafo acíclico e do esforço.
- Sprint original reproduz 33 entregas, 10 dias e **27h30 de caminho crítico**.

## Persistência e sincronização preparada

- Estado local versionado por organização; projetos ficam no mesmo documento canônico.
- Migração de snapshots anteriores preserva progresso e inicializa a seed original.
- Eventos auditáveis identificam organização, projeto e revisão.
- Envelopes de sincronização geram identificadores idempotentes.
- Reconciliação distingue estado local, remoto, sincronizado e conflito.
- Mudanças concorrentes não são descartadas silenciosamente.
- Reconciliação/importação rejeitam troca indevida de organização.
- O transporte remoto não foi ativado: depende do projeto Supabase **novo**, reservado à integração final.

## Evidências de teste

```bash
node --test tests/onda-1/*.test.mjs tests/ondas/*.test.mjs
```

Resultado local verificado: **101 testes aprovados; 0 falhas**.

## Gates

- Código da Onda 2: **PASSOU**.
- Equivalência local do produto: **PASSOU** nos testes de domínio e contrato de interface.
- Isolamento por organização no adaptador local: **PASSOU**.
- Supabase Postgres, RLS e Storage reais: **NÃO VERIFICADO**.
- Sincronização entre aparelhos: **NÃO VERIFICADO**.
- Stripe e direitos de acesso: **NÃO INTEGRADO**; o starter já contém `@repo/payments`.
- Typecheck/build completos: **NÃO VERIFICADO** neste ambiente sem dependências.
- CI hospedado e deployment Vercel: **PENDENTES**.
- Gate completo de integração da Onda 2: **NÃO PASSOU**.

Essas integrações foram explicitamente adiadas. Consulte `INTEGRACAO_FINAL.md`.
