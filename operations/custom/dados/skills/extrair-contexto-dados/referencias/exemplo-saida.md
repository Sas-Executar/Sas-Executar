# Exemplo de saída de uma habilidade específica

Este exemplo mostra o nível de detalhe esperado após a extração de contexto de uma organização fictícia.

```markdown
---
name: empresa-exemplo-analise-dados
description: "Habilidade de análise de dados da Empresa Exemplo. Define entidades, medidas, filtros obrigatórios, relações entre tabelas e padrões de consulta para BigQuery."
---

# Análise de dados — Empresa Exemplo

## Entidades

**Pessoa**

- representa uma identidade individual;
- tabela principal: `produto.pessoas`;
- identificador: `id_pessoa`.

**Organização**

- representa uma entidade que pode reunir várias pessoas;
- tabela principal: `produto.organizacoes`;
- identificador: `id_organizacao`.

**Relação**

- uma organização pode possuir várias pessoas;
- combinar por `id_organizacao`;
- uma pessoa pertence a no máximo uma organização neste modelo.

## Filtros obrigatórios

Excluir contas internas e dados de teste:

```sql
WHERE eh_interna = FALSE
  AND eh_teste = FALSE
  AND estado != 'apagado'
```

## Medidas

### Pessoas ativas no mês

**Definição:** quantidade de pessoas únicas que produziram pelo menos um evento válido durante o mês.

**Fonte:** `produto.eventos.id_pessoa`.

**Fórmula:** `COUNT(DISTINCT id_pessoa)` após aplicação dos filtros obrigatórios.

**Limitação:** eventos com atraso de ingestão podem alterar o valor dos dois dias mais recentes.

### Taxa de ativação

**Definição:** proporção de novas pessoas que concluem a ação de ativação em até sete dias da criação.

**Numerador:** pessoas novas com evento `ativacao_concluida` dentro da janela.

**Denominador:** todas as pessoas novas elegíveis no mesmo período.

## Atualização

| Tabela | Frequência | Atraso esperado |
|---|---|---|
| `produto.pessoas` | horária | até 30 minutos |
| `produto.eventos` | contínua | até 2 horas |

## Armadilhas conhecidas

1. `produto.pessoas.estado` representa estado atual, não histórico;
2. uma junção direta entre eventos e organizações pode multiplicar linhas quando a pessoa possui registros de vínculo antigos;
3. os dois dias mais recentes podem estar incompletos;
4. contas internas precisam ser excluídas antes de calcular atividade.

## Consulta de exemplo

```sql
SELECT
    DATE_TRUNC(DATE(data_evento), MONTH) AS mes,
    COUNT(DISTINCT id_pessoa) AS pessoas_ativas
FROM `produto.eventos`
WHERE data_evento >= TIMESTAMP('2026-01-01')
  AND eh_interno = FALSE
  AND eh_teste = FALSE
GROUP BY mes
ORDER BY mes;
```

## Limites de uso

Esta habilidade registra contexto conhecido, mas não substitui validação. Quando uma definição de medida ou relação mudar, a referência precisa ser atualizada antes de novas análises.
```
