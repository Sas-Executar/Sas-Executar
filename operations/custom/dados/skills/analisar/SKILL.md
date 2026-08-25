---
name: analisar
description: "Responder perguntas usando dados, desde uma consulta rápida até uma análise completa ou relatório formal. Usar para métricas, tendências, comparações, investigação de causas e conclusões fundamentadas."
argument-hint: "<pergunta>"
---

# /analisar — responder perguntas usando dados

> Para entender quais ferramentas podem fornecer os dados, consulte `../../CONECTORES.md`.

## Uso

```text
/analisar <pergunta em linguagem comum>
```

## Fluxo

### 1. Entender a pergunta

Classificar a necessidade:

- **resposta rápida**: uma medida, um filtro ou uma consulta factual;
- **análise completa**: comparação entre períodos, segmentos, causas ou tendências;
- **relatório formal**: investigação ampla com método, limitações, evidências e recomendações.

Identificar antes de consultar:

- população analisada;
- período;
- medidas necessárias;
- dimensões de comparação;
- fonte de dados provável;
- formato de saída: número, tabela, gráfico, texto ou combinação.

Se a pergunta estiver ampla, quebrá-la em perguntas menores que possam ser respondidas por dados observáveis.

### 2. Obter os dados

**Com `~~armazem-dados` conectado:**

1. localizar tabelas e colunas relevantes;
2. confirmar a unidade de cada linha e as relações entre tabelas;
3. escrever a consulta SQL necessária;
4. executar;
5. corrigir erros de sintaxe, nomes ou tipos se ocorrerem;
6. realizar verificações de plausibilidade antes de interpretar.

**Sem armazém conectado:**

Aceitar uma destas entradas:

- arquivo CSV, Excel, JSON ou Parquet;
- resultado de consulta colado pelo usuário;
- esquema descrito pelo usuário para geração de SQL a ser executado manualmente.

### 3. Analisar

- calcular medidas, proporções e agregações relevantes;
- comparar períodos, segmentos ou categorias;
- identificar padrões, tendências, anomalias e valores extremos;
- separar claramente **fato observado**, **interpretação** e **hipótese**;
- para problemas complexos, responder cada subpergunta antes de sintetizar a conclusão.

### 4. Validar antes de apresentar

Executar pelo menos estas verificações:

- quantidade de registros plausível;
- valores ausentes inesperados;
- duplicidades ou multiplicação causada por junções;
- magnitudes dentro de faixas possíveis;
- ausência de lacunas inexplicadas em séries temporais;
- subtotais coerentes com totais;
- denominadores corretos para taxas e percentuais;
- comparação entre períodos equivalentes;
- definição da população consistente;
- explicações alternativas consideradas.

Se houver dúvida relevante, investigar antes de concluir e registrar a limitação.

### 5. Apresentar

**Resposta rápida:**

- informar o resultado diretamente;
- indicar período, população e fonte;
- incluir a consulta usada quando isso melhorar a reprodutibilidade.

**Análise completa:**

1. principal conclusão;
2. evidência quantitativa;
3. comparação ou gráfico útil;
4. método resumido;
5. limitações;
6. perguntas seguintes recomendadas.

**Relatório formal:**

1. resumo executivo;
2. pergunta e escopo;
3. fontes de dados;
4. método;
5. resultados detalhados;
6. validações executadas;
7. limitações e possíveis vieses;
8. conclusão;
9. recomendações proporcionais à força da evidência.

### 6. Visualizar quando ajudar

Criar gráfico somente quando ele comunicar melhor que uma tabela. Escolher o formato pela relação dos dados, sem distorcer escalas ou esconder incerteza.

## Exemplos

```text
/analisar Quantas pessoas novas foram registradas no último mês?
```

```text
/analisar O que explica o aumento no volume de solicitações nos últimos três meses? Compare categoria, prioridade e período.
```

```text
/analisar Prepare uma avaliação formal da qualidade da tabela de clientes, cobrindo completude, consistência, atualização e riscos para decisões.
```

## Regra de conclusão

Não transformar correlação em causalidade. Não apresentar uma hipótese como fato. Não omitir incerteza, qualidade insuficiente ou limitação metodológica que possa alterar a decisão.
