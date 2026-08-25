---
name: consultas-sql
description: "Escrever SQL correto, legível e eficiente nos principais mecanismos analíticos. Usar como referência interna para consultas, otimização, tradução entre dialetos, CTEs, funções de janela, agregações, funis e coortes."
user-invocable: false
---

# Referência de consultas SQL

## Princípios gerais

1. confirmar o dialeto antes de usar funções específicas;
2. selecionar somente colunas necessárias;
3. filtrar cedo;
4. usar partições quando existirem;
5. documentar a unidade de agregação;
6. verificar cardinalidade antes de junções;
7. evitar multiplicação de linhas;
8. proteger divisões por zero;
9. comentar regras não óbvias;
10. validar resultado com contagens e ordens de grandeza conhecidas.

## PostgreSQL

Datas e horários:

```sql
CURRENT_DATE
CURRENT_TIMESTAMP
NOW()
DATE_TRUNC('month', data_criacao)
EXTRACT(YEAR FROM data_criacao)
data_evento + INTERVAL '7 days'
```

Boas práticas de desempenho:

- usar `EXPLAIN ANALYZE` para compreender o plano;
- criar índices em colunas frequentemente filtradas ou usadas em junções quando a administração do banco permitir;
- preferir `EXISTS` a subconsultas grandes com `IN` quando adequado;
- evitar busca sem limite em tabelas extensas durante exploração.

## BigQuery

Datas e horários:

```sql
CURRENT_DATE()
CURRENT_TIMESTAMP()
DATE_ADD(data_evento, INTERVAL 7 DAY)
DATE_DIFF(data_final, data_inicial, DAY)
DATE_TRUNC(data_evento, MONTH)
EXTRACT(YEAR FROM data_evento)
```

Boas práticas de custo e desempenho:

- sempre filtrar pela coluna de partição quando possível;
- evitar `SELECT *` porque o custo depende de bytes lidos;
- usar agrupamento físico em colunas muito filtradas quando o conjunto for grande;
- usar funções aproximadas somente quando a precisão exata não for necessária e isso estiver declarado;
- estimar o custo antes de consultas muito grandes.

## Snowflake

```sql
CURRENT_DATE()
CURRENT_TIMESTAMP()
DATEADD(day, 7, data_evento)
DATEDIFF(day, data_inicial, data_final)
DATE_TRUNC('month', data_evento)
```

Boas práticas:

- considerar chaves de agrupamento em tabelas grandes;
- filtrar por colunas que favoreçam eliminação de partições;
- escolher capacidade computacional compatível com a consulta;
- reutilizar resultado de consulta cara quando apropriado.

## Databricks SQL

```sql
CURRENT_DATE()
CURRENT_TIMESTAMP()
DATE_ADD(data_evento, 7)
DATEDIFF(data_final, data_inicial)
DATE_TRUNC('MONTH', data_evento)
```

Boas práticas:

- aproveitar recursos do Delta Lake quando disponíveis;
- otimizar organização física de tabelas extensas;
- usar memória temporária somente para conjuntos reutilizados e controlados;
- evitar particionamento excessivo.

## Padrões comuns

### Numeração por entidade

```sql
ROW_NUMBER() OVER (
    PARTITION BY id_usuario
    ORDER BY data_atualizacao DESC
)
```

### Total acumulado

```sql
SUM(valor) OVER (
    ORDER BY data_evento
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
```

### Média móvel de sete períodos

```sql
AVG(valor) OVER (
    ORDER BY data_evento
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
)
```

### Valor anterior

```sql
LAG(valor, 1) OVER (
    PARTITION BY entidade
    ORDER BY data_evento
)
```

### Deduplicação

```sql
WITH ordenados AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY id_entidade
            ORDER BY data_atualizacao DESC
        ) AS ordem
    FROM tabela_origem
)
SELECT
    *
FROM ordenados
WHERE ordem = 1;
```

### Estrutura por CTE

```sql
WITH populacao AS (
    SELECT
        id_usuario,
        data_criacao
    FROM usuarios
    WHERE data_criacao >= DATE '2026-01-01'
),

atividade AS (
    SELECT
        id_usuario,
        COUNT(*) AS quantidade_eventos
    FROM eventos
    GROUP BY id_usuario
)

SELECT
    populacao.id_usuario,
    COALESCE(atividade.quantidade_eventos, 0) AS quantidade_eventos
FROM populacao
LEFT JOIN atividade
    ON populacao.id_usuario = atividade.id_usuario;
```

## Depuração

Quando uma consulta falhar:

1. confirmar sintaxe do dialeto;
2. conferir nomes de tabelas e colunas;
3. conferir maiúsculas e identificadores entre aspas;
4. converter tipos explicitamente quando necessário;
5. qualificar colunas ambíguas;
6. conferir regras de `GROUP BY`;
7. proteger divisão por zero;
8. verificar se a junção usa chave correta;
9. comparar quantidade de linhas antes e depois de cada junção.

## Regra principal

SQL eficiente não compensa uma pergunta mal definida. Correção da população, do período, das relações e da agregação vem antes de otimização.
