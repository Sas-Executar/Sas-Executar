---
name: escrever-consulta
description: "Transformar uma necessidade descrita em linguagem comum em uma consulta SQL correta, legível e eficiente para o mecanismo utilizado. Usar para filtros, agregações, junções, coortes, funis e consultas analíticas em geral."
argument-hint: "<descrição dos dados necessários>"
---

# /escrever-consulta — transformar pergunta em SQL

> Para conectores disponíveis, consulte `../../CONECTORES.md`.

## Uso

```text
/escrever-consulta <descrição dos dados necessários>
```

## Fluxo

### 1. Entender a necessidade

Identificar:

- **colunas de saída**: o que o resultado precisa mostrar;
- **filtros**: período, segmento, estado ou condição;
- **agregações**: contagem, soma, média, mediana ou proporção;
- **junções**: quais tabelas precisam ser combinadas;
- **ordenação**: como o resultado deve ser classificado;
- **limite**: quantidade máxima de linhas quando aplicável;
- **unidade da linha resultante**: o que cada linha final representa.

### 2. Determinar o dialeto SQL

Usar o dialeto correspondente ao mecanismo realmente utilizado:

- PostgreSQL;
- Snowflake;
- BigQuery;
- Redshift;
- Databricks SQL;
- MySQL;
- SQL Server;
- DuckDB;
- SQLite;
- outro mecanismo informado.

Não misturar funções de dialetos diferentes.

### 3. Descobrir o esquema quando houver conexão

Antes de escrever uma consulta complexa:

1. localizar as tabelas relevantes;
2. conferir nomes e tipos das colunas;
3. identificar relações e cardinalidade entre tabelas;
4. verificar partições ou agrupamentos físicos importantes para custo e desempenho;
5. procurar visões já preparadas que evitem recomputação desnecessária.

### 4. Escrever a consulta

Regras obrigatórias:

- especificar somente as colunas necessárias; evitar `SELECT *` em consultas de produção;
- filtrar o mais cedo possível;
- aplicar filtro de partição quando existir;
- usar uma etapa lógica por CTE quando a consulta tiver várias transformações;
- nomear CTEs de forma descritiva;
- escolher corretamente `INNER JOIN`, `LEFT JOIN` ou outra junção;
- verificar risco de multiplicação de linhas em relações muitos-para-muitos;
- evitar subconsultas correlacionadas quando uma junção ou função de janela for mais clara;
- comentar o motivo de regras não óbvias;
- qualificar colunas ambíguas com o nome ou apelido da tabela;
- proteger divisões contra denominador zero;
- preservar o nível de agregação esperado.

### 5. Apresentar a consulta

Entregar sempre:

1. consulta SQL completa;
2. explicação breve das etapas;
3. observações sobre custo ou desempenho quando relevantes;
4. indicação de como alterar período, segmento ou granularidade;
5. advertências sobre suposições ainda não confirmadas.

### 6. Executar quando possível

Se `~~armazem-dados` estiver conectado, executar a consulta e verificar o resultado. Se não estiver, entregar SQL pronto para execução manual e solicitar somente o resultado necessário para a análise.

## Modelo de consulta legível

```sql
WITH populacao_base AS (
    SELECT
        id_usuario,
        data_criacao,
        tipo_plano
    FROM usuarios
    WHERE data_criacao >= DATE '2026-01-01'
),

medidas_por_usuario AS (
    SELECT
        usuario.id_usuario,
        usuario.tipo_plano,
        COUNT(DISTINCT evento.id_sessao) AS quantidade_sessoes
    FROM populacao_base AS usuario
    LEFT JOIN eventos AS evento
        ON usuario.id_usuario = evento.id_usuario
    GROUP BY
        usuario.id_usuario,
        usuario.tipo_plano
)

SELECT
    tipo_plano,
    COUNT(*) AS quantidade_usuarios,
    AVG(quantidade_sessoes) AS media_sessoes
FROM medidas_por_usuario
GROUP BY tipo_plano
ORDER BY quantidade_usuarios DESC;
```

## Exemplos de pedido

```text
/escrever-consulta Conte pedidos por estado nos últimos 30 dias.
```

```text
/escrever-consulta Crie uma análise de retenção por coorte, agrupando pessoas pelo mês de entrada e mostrando a proporção ativa após 1, 3, 6 e 12 meses. O mecanismo é BigQuery.
```

## Regra principal

A consulta deve ser reproduzível e responder exatamente à pergunta definida. Antes de otimizar velocidade, garantir correção da população, do período, das junções, dos denominadores e da unidade de agregação.
