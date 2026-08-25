# Modelo de habilidade de análise de dados

Use este modelo ao gerar uma habilidade específica para uma organização. Substitua todos os marcadores entre sinais de menor e maior.

```markdown
---
name: <organizacao>-analise-dados
description: "Habilidade de análise de dados da organização <ORGANIZACAO>. Fornece contexto para consultar <ARMAZEM>, incluindo definições de entidades, cálculos de medidas e padrões de consulta."
---

# Análise de dados — <ORGANIZACAO>

## Dialeto SQL

<INSERIR_ORIENTACOES_DO_MECANISMO>

## Desambiguação de entidades

Quando alguém usar termos ambíguos, confirmar qual entidade pretende analisar.

**“Usuário” pode significar:**

- **Conta**: uma identidade individual — `<TABELA_PRINCIPAL>.<ID>`;
- **Organização**: entidade que agrupa várias contas — `<TABELA_ORGANIZACOES>.<ID>`;
- **<OUTRO_TIPO>**: <DEFINICAO> — `<TABELA>.<ID>`.

**Relações:**

- <ENTIDADE_1> → <ENTIDADE_2>: <TIPO_RELACAO>, usando `<CHAVE>`.

## Terminologia de negócio

| Termo | Definição | Observações |
|---|---|---|
| <TERMO_1> | <DEFINICAO> | <CONTEXTO> |
| <TERMO_2> | <DEFINICAO> | <CONTEXTO> |

## Filtros obrigatórios

Aplicar estes filtros, salvo instrução explícita em contrário:

```sql
WHERE <CAMPO_TESTE> = FALSE
  AND <CAMPO_INTERNO> = FALSE
  AND <CAMPO_ESTADO> != '<ESTADO_EXCLUIDO>'
```

Registrar quando uma exceção é permitida.

## Medidas principais

### <MEDIDA_1>

- **Definição:** <EXPLICACAO>;
- **Fórmula:** `<CALCULO_EXATO>`;
- **Fonte:** `<TABELA>.<COLUNA>`;
- **Unidade temporal:** <DIARIA, SEMANAL OU MENSAL>;
- **Limitações:** <CASOS_LIMITE>.

## Atualização dos dados

| Tabela | Frequência | Atraso esperado |
|---|---|---|
| <TABELA_1> | <FREQUENCIA> | <ATRASO> |
| <TABELA_2> | <FREQUENCIA> | <ATRASO> |

Para verificar atualização:

```sql
SELECT MAX(<COLUNA_DATA>) AS dado_mais_recente
FROM <TABELA>;
```

## Navegação da base de conhecimento

| Domínio | Arquivo | Usar para |
|---|---|---|
| <DOMINIO_1> | `referencias/<dominio-1>.md` | <FINALIDADE> |
| <DOMINIO_2> | `referencias/<dominio-2>.md` | <FINALIDADE> |
| Entidades | `referencias/entidades.md` | definições e relações |
| Medidas | `referencias/medidas.md` | cálculos e fórmulas |

## Padrões de consulta

### <PADRAO_1>

```sql
<CONSULTA>
```

### <PADRAO_2>

```sql
<CONSULTA>
```

## Resolução de problemas

### Erros comuns

- **<ERRO_1>**: <EXPLICACAO> → <ABORDAGEM_CORRETA>;
- **<ERRO_2>**: <EXPLICACAO> → <ABORDAGEM_CORRETA>.

### Acesso

- se houver erro de permissão em `<TABELA>`, seguir <PROCEDIMENTO>;
- para colunas restritas com dado pessoal, usar <ALTERNATIVA_AUTORIZADA>.

### Desempenho

- filtrar por `<COLUNA_PARTICAO>` antes de ampliar a consulta;
- usar `LIMIT` durante exploração de tabela muito grande;
- preferir tabela já agregada quando ela preservar a medida necessária.
```

## Regras de preenchimento

1. não deixar marcadores sem substituição;
2. remover seções que não se aplicam;
3. usar nomes reais de tabelas e colunas;
4. incluir consultas executáveis;
5. priorizar informação específica da organização sobre orientação genérica;
6. manter o documento fácil de percorrer com tabelas e blocos de código;
7. não incluir segredos, chaves ou credenciais.
