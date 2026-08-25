# Modelo de arquivo de referência por domínio

Use este modelo para documentar um domínio específico, como receita, usuários, produto, crescimento, vendas, marketing ou suporte.

```markdown
# Tabelas de <DOMINIO>

Este documento registra tabelas, medidas, relações e padrões de consulta do domínio <DOMINIO>.

## Referência rápida

### Contexto de negócio

<duas ou três frases explicando o domínio, entidades principais e conceitos importantes>

### Desambiguação de entidades

**O termo “<TERMO_AMBIGUO>” pode significar:**

- **<SIGNIFICADO_1>**: <DEFINICAO> — tabela `<TABELA>`, campo `<ID>`;
- **<SIGNIFICADO_2>**: <DEFINICAO> — tabela `<TABELA>`, campo `<ID>`.

Sempre confirmar qual significado é pretendido antes de consultar.

### Filtros obrigatórios

```sql
WHERE <FILTRO_PADRAO_1>
  AND <FILTRO_PADRAO_2>
```

## Tabelas principais

### <TABELA_1>

**Localização:** `<projeto.conjunto.tabela>` ou `<esquema.tabela>`  
**Descrição:** <o que contém e quando usar>  
**Unidade da linha:** <uma linha por quê?>  
**Chave primária:** `<CAMPO>`  
**Atualização:** <frequência e atraso esperado>  
**Partição:** `<CAMPO_PARTICAO>` quando aplicável

| Coluna | Tipo | Descrição | Observações |
|---|---|---|---|
| `<coluna_1>` | <TIPO> | <DESCRICAO> | <RISCO OU CONTEXTO> |
| `<coluna_2>` | <TIPO> | <DESCRICAO> | |
| `<coluna_3>` | <TIPO> | <DESCRICAO> | pode estar ausente |

**Relações:**

- combina com `<OUTRA_TABELA>` por `<CHAVE>`;
- relação esperada: <um-para-um, um-para-muitos ou muitos-para-muitos>.

## Medidas principais

| Medida | Definição | Fonte | Fórmula | Observações |
|---|---|---|---|---|
| <MEDIDA_1> | <DEFINICAO> | `<TABELA>` | `<FORMULA>` | <LIMITACOES> |
| <MEDIDA_2> | <DEFINICAO> | `<TABELA>` | `<FORMULA>` | |

## Consultas de exemplo

### <FINALIDADE_1>

```sql
-- Descrição breve da finalidade
SELECT
    <colunas>
FROM <tabela>
WHERE <filtros_obrigatorios>
GROUP BY <agrupamento>
ORDER BY <ordenacao>;
```

### <FINALIDADE_2>

```sql
<CONSULTA_COMUM>
```

## Armadilhas conhecidas

1. **<PROBLEMA_1>**: <EXPLICACAO>.
   - incorreto: `<ABORDAGEM_INCORRETA>`
   - correto: `<ABORDAGEM_CORRETA>`

2. **<PROBLEMA_2>**: <EXPLICACAO>.

## Painéis relacionados

| Painel | Endereço | Finalidade |
|---|---|---|
| <PAINEL_1> | <URL> | <DESCRICAO> |
```

## Regras para criar arquivos de domínio

1. começar pelas tabelas mais consultadas;
2. documentar em detalhe apenas colunas importantes;
3. preferir exemplos reais a descrições abstratas;
4. destacar armadilhas e exclusões;
5. manter consultas de exemplo executáveis;
6. registrar estruturas aninhadas de forma explícita;
7. indicar unidade de cada linha e cardinalidade das relações.

## Domínios comuns

- `receita.md` — cobrança, assinaturas e transações;
- `usuarios.md` — contas, autenticação e atributos;
- `produto.md` — eventos, sessões e uso de funcionalidades;
- `crescimento.md` — atividade, retenção e ativação;
- `vendas.md` — oportunidades e etapas comerciais;
- `marketing.md` — campanhas, atribuição e contatos;
- `suporte.md` — solicitações, satisfação e tempo de resposta.
