---
name: explorar-dados
description: "Examinar uma tabela ou arquivo para compreender estrutura, qualidade, atualização e padrões antes de qualquer análise. Usar ao receber um conjunto de dados novo ou quando houver dúvida sobre colunas, valores ausentes, duplicidades ou distribuição."
argument-hint: "<tabela ou arquivo>"
---

# /explorar-dados — conhecer um conjunto de dados

> Para conectores disponíveis, consulte `../../CONECTORES.md`.

## Uso

```text
/explorar-dados <tabela ou arquivo>
```

## Fluxo

### 1. Acessar os dados

**Com `~~armazem-dados` conectado:**

1. resolver o nome da tabela;
2. consultar colunas, tipos e descrições disponíveis;
3. executar consultas de perfil diretamente nos dados.

**Com arquivo:**

1. carregar CSV, Excel, JSON ou Parquet;
2. inferir tipos das colunas;
3. preservar o arquivo original sem sobrescrever.

### 2. Entender a estrutura

Responder:

- quantas linhas e colunas existem;
- o que uma linha representa;
- qual campo ou conjunto de campos identifica uma linha de forma única;
- quando os dados foram atualizados;
- qual período histórico está coberto;
- quais tabelas ou arquivos podem se relacionar com este conjunto.

Classificar colunas como:

- **identificador**: chave da entidade;
- **dimensão**: categoria usada para agrupar ou filtrar;
- **medida**: valor quantitativo;
- **temporal**: data ou horário;
- **texto**: conteúdo livre;
- **lógico**: verdadeiro ou falso;
- **estrutural**: JSON, lista, matriz ou estrutura aninhada.

### 3. Produzir o perfil

Para a tabela:

- quantidade total de linhas;
- quantidade de colunas por tipo;
- período mínimo e máximo;
- tamanho aproximado, quando disponível.

Para todas as colunas:

- quantidade e proporção de valores ausentes;
- quantidade de valores distintos;
- valores mais frequentes;
- valores raros ou suspeitos.

Para medidas numéricas:

- mínimo e máximo;
- média e mediana;
- desvio padrão;
- percentis 1, 5, 25, 75, 95 e 99;
- quantidade de zeros;
- valores negativos quando forem inesperados.

Para texto e categorias:

- comprimentos mínimo, máximo e médio;
- campos vazios;
- inconsistências de maiúsculas, espaços e formatos;
- categorias com grafias diferentes representando o mesmo conceito.

Para datas:

- menor e maior data;
- valores ausentes;
- datas futuras quando forem impossíveis;
- distribuição mensal ou semanal;
- lacunas em séries temporais.

### 4. Identificar problemas de qualidade

Sinalizar, sem corrigir silenciosamente:

- mais de 5% de valores ausentes como atenção;
- mais de 20% como alerta importante;
- identificadores que não são únicos quando deveriam ser;
- duplicidades;
- valores impossíveis;
- campos categóricos com variações de escrita;
- distribuições extremamente assimétricas;
- dados aparentemente desatualizados;
- violações de regra, como data final anterior à inicial.

### 5. Descobrir relações e padrões

Procurar:

- possíveis chaves para junção;
- hierarquias, como país → estado → cidade;
- medidas que variam juntas;
- colunas derivadas de outras;
- colunas redundantes;
- segmentos com comportamentos muito diferentes.

### 6. Recomendar dimensões e medidas úteis

Indicar:

- melhores dimensões para segmentação;
- medidas quantitativas mais informativas;
- colunas temporais adequadas para tendência;
- possíveis chaves de junção;
- agrupamentos naturais.

### 7. Recomendar próximas análises

Sugerir de três a cinco perguntas específicas, por exemplo:

- tendência de uma medida ao longo do tempo por segmento;
- investigação de valores extremos;
- análise de uma coluna com muitos valores ausentes;
- relação entre duas medidas;
- análise de coortes usando uma data e um estado.

## Formato de saída

```text
Perfil dos dados: <nome>

Visão geral
- linhas:
- colunas:
- unidade de cada linha:
- período:
- atualização:

Colunas principais
<tabela resumida>

Problemas de qualidade
<lista com gravidade e impacto>

Relações e padrões
<achados>

Próximas análises recomendadas
<lista numerada>
```

## Regra principal

Nunca iniciar uma análise importante sem compreender antes a unidade de cada linha, a qualidade dos campos usados, o período coberto e as possíveis duplicidades.
