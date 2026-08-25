# Referência de dialetos SQL

Use somente a seção correspondente ao mecanismo realmente utilizado pela organização.

## BigQuery

### Datas

```sql
CURRENT_DATE()
CURRENT_TIMESTAMP()
DATE_ADD(data_evento, INTERVAL 7 DAY)
DATE_SUB(data_evento, INTERVAL 1 MONTH)
DATE_DIFF(data_final, data_inicial, DAY)
DATE_TRUNC(data_evento, MONTH)
EXTRACT(YEAR FROM data_evento)
```

### Texto

```sql
LOWER(coluna) LIKE '%padrao%'
REGEXP_CONTAINS(coluna, r'padrao')
REGEXP_EXTRACT(coluna, r'padrao')
```

### Listas

```sql
ARRAY_AGG(coluna)
UNNEST(coluna_lista)
ARRAY_LENGTH(coluna_lista)
```

### Cuidados

- filtrar a coluna de partição;
- evitar `SELECT *` em tabelas grandes;
- conferir quantidade estimada de bytes antes de consulta muito ampla;
- usar funções aproximadas somente quando a precisão permitir.

## PostgreSQL

### Datas

```sql
CURRENT_DATE
CURRENT_TIMESTAMP
NOW()
DATE_TRUNC('month', data_criacao)
EXTRACT(YEAR FROM data_criacao)
data_evento + INTERVAL '7 days'
```

### Texto

```sql
coluna ILIKE '%padrao%'
CONCAT(nome, ' ', sobrenome)
REGEXP_REPLACE(coluna, 'padrao', 'substituicao')
```

### JSON

```sql
dados->>'chave'
dados->'objeto'->>'chave'
```

### Cuidados

- usar `EXPLAIN ANALYZE` para consultas lentas;
- conferir índices quando houver permissão de administração;
- evitar junções sem chave seletiva em tabelas extensas.

## Snowflake

```sql
CURRENT_DATE()
CURRENT_TIMESTAMP()
DATEADD(day, 7, data_evento)
DATEDIFF(day, data_inicial, data_final)
DATE_TRUNC('month', data_evento)
```

Para dados semiestruturados:

```sql
dados:cliente:nome::STRING
```

Cuidados:

- observar agrupamento físico em tabelas extensas;
- escolher capacidade computacional proporcional à consulta;
- aproveitar resultados já calculados quando isso evitar custo desnecessário.

## Redshift

```sql
CURRENT_DATE
GETDATE()
DATEADD(day, 7, data_evento)
DATEDIFF(day, data_inicial, data_final)
DATE_TRUNC('month', data_evento)
```

Cuidados:

- observar chaves de distribuição e ordenação;
- usar `EXPLAIN` para entender movimentação de dados;
- evitar junções que obriguem redistribuição excessiva.

## Databricks SQL

```sql
CURRENT_DATE()
CURRENT_TIMESTAMP()
DATE_ADD(data_evento, 7)
DATEDIFF(data_final, data_inicial)
DATE_TRUNC('MONTH', data_evento)
```

Com Delta Lake, usar recursos de histórico e otimização somente quando disponíveis e necessários.

## DuckDB

Adequado para análise local de CSV, Parquet e outros arquivos sem servidor.

```sql
SELECT
    categoria,
    COUNT(*) AS quantidade
FROM read_parquet('dados.parquet')
GROUP BY categoria
ORDER BY quantidade DESC;
```

## Regra de compatibilidade

Nunca copiar uma função de um mecanismo para outro sem confirmar compatibilidade. Datas, expressões regulares, tipos semiestruturados e funções de aproximação são áreas em que os dialetos divergem com frequência.
