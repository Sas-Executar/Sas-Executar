# Complemento de análise de dados

Esta pasta é uma adaptação funcional para português do componente oficial de análise de dados da Anthropic. O objetivo é permitir uso no Cowork e no Claude Code sem exigir domínio prévio de terminologia em inglês.

## Regra de idioma

Todo texto destinado a leitura humana deve estar em português: títulos, instruções, exemplos, comandos, mensagens, nomes de habilidades e modelos de saída.

Exceções permitidas somente quando necessárias para funcionamento:

- nomes próprios de produtos e serviços, como BigQuery, Snowflake, Databricks e Amplitude;
- siglas técnicas, como SQL, MCP, JSON, CSV e HTML;
- palavras reservadas e sintaxe de linguagens, protocolos e formatos;
- nomes estruturais exigidos pelo carregador do Claude, como `.claude-plugin`, `.mcp.json`, `skills`, `SKILL.md` e chaves obrigatórias de configuração;
- endereços de rede e identificadores externos.

Não usar termos em inglês como linguagem explicativa quando houver equivalente claro em português.

## O que este complemento faz

- consulta armazéns de dados conectados;
- explora esquemas, tabelas e arquivos;
- escreve consultas SQL adequadas ao mecanismo utilizado;
- analisa resultados e identifica padrões;
- aplica estatística descritiva e testes quando necessários;
- cria visualizações;
- cria painéis interativos;
- valida metodologia, cálculos, vieses e conclusões antes do compartilhamento;
- registra contexto específico de uma organização para consultas futuras.

## Comandos principais

| Comando | Finalidade |
|---|---|
| `/analisar` | responder uma pergunta usando dados |
| `/explorar-dados` | entender estrutura, qualidade e padrões de uma tabela ou arquivo |
| `/escrever-consulta` | transformar uma necessidade em consulta SQL |
| `/criar-visualizacao` | criar gráfico adequado aos dados e à pergunta |
| `/construir-painel` | criar painel HTML interativo |
| `/validar-dados` | revisar análise, cálculo, método, viés e conclusão |

## Fluxo recomendado para iniciantes

### 1. Preparar

1. definir a pergunta de decisão;
2. identificar a fonte de dados;
3. confirmar acesso e permissões;
4. conectar o armazém por MCP ou fornecer arquivo CSV, Excel, JSON ou Parquet;
5. executar `/explorar-dados` antes de qualquer análise importante.

**Saída esperada:** compreensão da estrutura, atualização, unidade de cada linha, chaves, dimensões, métricas e problemas de qualidade.

### 2. Consultar e executar

1. escrever a pergunta em linguagem comum;
2. definir período, população, segmentos e medida desejada;
3. usar `/escrever-consulta` quando for necessário SQL;
4. executar a consulta no armazém conectado ou manualmente;
5. conferir se o resultado parece plausível antes de interpretar.

**Saída esperada:** conjunto de resultados reproduzível que responde à pergunta formulada.

### 3. Analisar e validar

1. usar `/analisar` para comparar, segmentar e interpretar;
2. separar fato observado de interpretação;
3. verificar valores ausentes, duplicidades, denominadores, períodos e junções;
4. usar `/validar-dados` antes de qualquer decisão relevante;
5. registrar conclusão, limitações, nível de confiança e próxima pergunta.

**Saída esperada:** conclusão defensável, com fonte, método, limitações e evidência suficiente para uma decisão.

## Com armazém de dados conectado

O Claude pode descobrir tabelas e colunas, escrever SQL, executar consultas, revisar resultados e iterar sem cópia manual.

## Sem armazém conectado

Também é possível trabalhar com arquivos CSV, Excel, JSON ou Parquet, resultados SQL colados na conversa ou uma descrição do esquema. Nesse caso, o Claude pode escrever a consulta para execução manual e depois analisar o resultado fornecido.

## Princípio de segurança analítica

Nenhuma conclusão deve ser tratada como evidência somente porque uma consulta foi executada. Toda análise relevante deve passar por verificação de qualidade dos dados, coerência das agregações, possíveis vieses, explicações alternativas e limitações.
