---
name: construir-painel
description: "Criar um painel HTML interativo e autocontido com indicadores, gráficos, filtros e tabelas. Usar para visão executiva, acompanhamento operacional ou relatório compartilhável em navegador."
argument-hint: "<descrição> [fonte de dados]"
---

# /construir-painel — criar painel interativo

> Para conectores disponíveis, consulte `../../CONECTORES.md`.

## Uso

```text
/construir-painel <descrição do painel> [fonte de dados]
```

## Fluxo

### 1. Definir requisitos

Determinar:

- finalidade do painel;
- pessoas que o utilizarão;
- indicadores principais;
- dimensões disponíveis para filtro;
- período;
- fonte dos dados;
- necessidade de detalhamento por linha.

### 2. Obter os dados

**Com `~~armazem-dados` conectado:** consultar somente os dados necessários e incorporar o resultado como JSON no arquivo HTML.

**Com arquivo ou dados fornecidos:** carregar, limpar e incorporar os dados no próprio painel.

**Sem dados reais:** somente usar dados fictícios quando o usuário pedir uma demonstração ou quando não houver outra forma de representar o modelo. Identificar visualmente que são dados fictícios.

### 3. Estruturar a página

Padrão recomendado:

```text
┌────────────────────────────────────────────┐
│ Título                         [Filtros]    │
├──────────┬──────────┬──────────┬──────────┤
│ Indicador│ Indicador│ Indicador│ Indicador│
├──────────┴──────────┼──────────┴──────────┤
│ Gráfico principal   │ Gráfico secundário  │
├─────────────────────┴─────────────────────┤
│ Tabela detalhada                         │
└───────────────────────────────────────────┘
```

Usar de dois a quatro indicadores de destaque, um a três gráficos e tabela detalhada somente quando ela acrescentar capacidade de investigação.

### 4. Construir o HTML

Gerar um único arquivo autocontido sempre que possível.

Requisitos:

- estrutura HTML semântica;
- composição responsiva com CSS;
- controles de filtro claros;
- indicadores com rótulos e unidade;
- gráficos interativos;
- tabela ordenável quando necessária;
- dados incorporados no arquivo;
- impressão legível;
- ausência de servidor obrigatório para abrir o resultado.

Quando for usado Chart.js, carregar a biblioteca por endereço confiável e manter toda lógica específica do painel no próprio arquivo.

### 5. Interatividade

Filtros devem atualizar de maneira coerente:

- indicadores;
- gráficos;
- tabela;
- período exibido;
- subtítulos ou observações relevantes.

Nenhum componente pode mostrar população ou período diferente sem indicação explícita.

### 6. Regras visuais

- títulos devem explicar o que está sendo medido;
- não usar cor como decoração;
- destacar exceções e metas de forma consistente;
- manter legibilidade em telas menores;
- evitar excesso de indicadores;
- evitar gráficos redundantes;
- mostrar fonte e data de atualização;
- evitar eixos ou escalas que distorçam comparação.

### 7. Salvar e verificar

1. salvar com nome descritivo em português;
2. abrir no navegador;
3. confirmar que filtros funcionam;
4. confirmar que valores dos indicadores batem com os dados de origem;
5. verificar comportamento em largura reduzida;
6. verificar ausência de erros de execução;
7. registrar instruções para atualizar os dados.

## Saída mínima

O painel final deve conter:

- título;
- período;
- fonte;
- indicadores principais;
- pelo menos uma representação que responda à pergunta central;
- filtros somente quando úteis;
- data de atualização;
- observação de limitações relevantes.

## Regra principal

Um painel não substitui análise. Ele deve permitir leitura consistente de medidas já definidas e validadas, sem criar métricas novas ou regras de negócio implícitas na camada visual.
