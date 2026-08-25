---
name: extrair-contexto-dados
description: "Criar ou melhorar uma habilidade de análise de dados específica para uma organização, extraindo conhecimento sobre entidades, medidas, tabelas, filtros, terminologia e padrões de consulta. Usar para registrar contexto que normalmente existe apenas na experiência das pessoas analistas."
---

# Extrair contexto de dados

Esta habilidade registra conhecimento específico de uma organização para que futuras análises usem as definições corretas de entidades, medidas, tabelas, filtros e relações.

## Dois modos

1. **modo de criação inicial**: criar uma nova habilidade de contexto a partir do zero;
2. **modo de ampliação**: acrescentar um domínio, medida, tabela ou regra a uma habilidade já existente.

## Modo de criação inicial

### Fase 1 — conexão e descoberta

#### 1. Identificar o mecanismo

Perguntar qual armazém de dados está sendo utilizado. Exemplos: BigQuery, Snowflake, PostgreSQL, Redshift ou Databricks.

Usar `~~armazem-dados` quando houver conexão MCP. Se houver dúvida, conferir as ferramentas realmente disponíveis na sessão.

#### 2. Explorar o esquema

1. listar conjuntos ou esquemas disponíveis;
2. identificar de três a cinco tabelas consultadas com maior frequência;
3. obter colunas, tipos, descrições, chaves e atualização dessas tabelas;
4. mapear relações importantes.

### Fase 2 — perguntas centrais

Fazer as perguntas de forma conversacional, uma por vez quando necessário.

#### Desambiguar entidades

Perguntar:

> Quando alguém diz “usuário”, “cliente”, “conta” ou “organização”, o que exatamente cada termo representa?

Registrar:

- tipos de entidade;
- relações um-para-um, um-para-muitos ou muitos-para-muitos;
- campos que ligam as entidades;
- situações em que um termo é ambíguo.

#### Identificadores principais

Perguntar quais campos identificam cada entidade e se existem vários identificadores para a mesma coisa.

Registrar:

- chave primária;
- identificador de negócio;
- UUID ou número inteiro;
- identificadores antigos ainda existentes.

#### Medidas principais

Perguntar quais são as duas ou três medidas mais consultadas e como cada uma é calculada.

Registrar:

- fórmula exata;
- tabelas e colunas de origem;
- período de cálculo;
- inclusões e exclusões;
- arredondamento ou regras especiais.

#### Higiene dos dados

Perguntar o que deve ser sempre removido das consultas, como:

- dados de teste;
- pessoas internas;
- fraude;
- registros apagados;
- estados inválidos.

Transformar essas respostas em filtros SQL explícitos.

#### Erros comuns

Perguntar quais enganos pessoas novas costumam cometer.

Procurar:

- nomes de colunas confusos;
- problemas de fuso horário;
- comportamento de valores `NULL`;
- diferença entre estado histórico e estado atual;
- tabelas que parecem equivalentes mas não são;
- relações que multiplicam linhas.

### Fase 3 — gerar a habilidade específica

Criar estrutura semelhante a:

```text
<organizacao>-analise-dados/
├── SKILL.md
└── referencias/
    ├── entidades.md
    ├── medidas.md
    ├── tabelas/
    │   ├── <dominio-1>.md
    │   └── <dominio-2>.md
    └── paineis.json
```

Usar os modelos em `referencias/` desta habilidade.

### Fase 4 — empacotar e entregar

1. criar todos os arquivos;
2. conferir se nenhum marcador de preenchimento ficou vazio;
3. validar links internos;
4. executar o roteiro de empacotamento quando necessário;
5. resumir o contexto capturado e as lacunas restantes.

## Modo de ampliação

### 1. Carregar a habilidade existente

Ler `SKILL.md` e referências atuais antes de alterar.

### 2. Identificar a lacuna

Perguntar qual domínio, medida, tabela, termo ou consulta está produzindo resultado incorreto ou incompleto.

### 3. Descoberta direcionada

Para o domínio escolhido:

1. explorar tabelas relevantes;
2. perguntar medidas principais;
3. perguntar filtros obrigatórios;
4. registrar armadilhas conhecidas;
5. gerar ou atualizar o arquivo de referência correspondente.

### 4. Atualizar e revalidar

1. adicionar a referência;
2. atualizar navegação do `SKILL.md` específico;
3. conferir consistência com definições existentes;
4. empacotar novamente;
5. registrar o que mudou.

## Padrão para documentação de tabela

Cada tabela deve registrar:

- localização completa;
- finalidade;
- unidade de cada linha;
- chave primária;
- frequência de atualização;
- colunas importantes;
- relações;
- filtros obrigatórios;
- duas ou três consultas de exemplo;
- problemas conhecidos.

## Padrão para medida

Cada medida deve registrar:

- nome;
- definição em linguagem comum;
- fórmula exata;
- fonte;
- unidade temporal;
- inclusões e exclusões;
- limitações.

## Verificação antes da entrega

- [ ] `SKILL.md` possui metadados obrigatórios.
- [ ] entidades ambíguas estão desambiguadas.
- [ ] terminologia principal está definida.
- [ ] filtros obrigatórios estão documentados.
- [ ] há exemplos de consulta por domínio.
- [ ] o SQL usa o dialeto correto.
- [ ] referências estão ligadas a partir da navegação principal.
- [ ] segredos e credenciais não foram incluídos.

## Regra principal

Conhecimento específico da organização deve ser registrado de forma explícita e verificável. A habilidade não deve inventar definição de medida, relação de tabela ou regra de exclusão que não tenha sido confirmada por fonte confiável ou pessoa responsável pelo dado.
