# Conectores

## Como funcionam as referências de ferramentas

As habilidades desta pasta descrevem ferramentas por categoria, e não por fornecedor específico. Assim, `~~armazem-dados` significa qualquer armazém de dados conectado e compatível com MCP.

Exemplo: a categoria `~~armazem-dados` pode ser atendida por BigQuery, Snowflake, Databricks, PostgreSQL ou outro mecanismo compatível.

## Categorias previstas

| Categoria | Marcador usado nas instruções | Serviços já previstos | Outras opções possíveis |
|---|---|---|---|
| Armazém de dados | `~~armazem-dados` | BigQuery, Snowflake, Databricks, Definite | Redshift, PostgreSQL, MySQL |
| Caderno computacional | `~~caderno` | Hex | Jupyter, Deepnote, Observable |
| Análise de produto | `~~analise-produto` | Amplitude | Mixpanel, Heap |
| Acompanhamento de projetos | `~~projetos` | Atlassian | Linear, Asana |

## Regra de escolha

1. verificar quais ferramentas MCP estão realmente conectadas na sessão;
2. escolher a ferramenta da categoria que já possui acesso aos dados necessários;
3. não pedir nova infraestrutura quando um arquivo local ou uma conexão existente for suficiente;
4. nunca inserir segredos, senhas ou chaves de acesso em arquivos versionados;
5. quando houver mais de uma fonte possível, priorizar a fonte oficial, mais atual e mais próxima do dado original.

## Funcionamento sem conector

Se nenhuma ferramenta da categoria estiver conectada, usar uma destas alternativas:

- arquivo CSV, Excel, JSON ou Parquet;
- resultado SQL fornecido pelo usuário;
- descrição do esquema para geração de consulta manual;
- arquivo local acessível ao Cowork ou Claude Code.
