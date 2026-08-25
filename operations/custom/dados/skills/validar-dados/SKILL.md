---
name: validar-dados
description: "Revisar uma análise antes de compartilhar ou usar em decisão, verificando método, qualidade dos dados, cálculos, junções, vieses, visualizações e força das conclusões."
argument-hint: "<análise a revisar>"
---

# /validar-dados — revisar análise antes de decidir ou compartilhar

> Para conectores disponíveis, consulte `../../CONECTORES.md`.

## Uso

```text
/validar-dados <análise a revisar>
```

A entrada pode ser relatório, arquivo, planilha, consulta SQL, resultado de consulta, gráfico ou descrição do método.

## Fluxo

### 1. Revisar pergunta, método e suposições

Verificar:

- se a pergunta está bem definida;
- se a fonte de dados é adequada;
- se o período é apropriado;
- se a população analisada está corretamente definida;
- se exclusões foram intencionais;
- se as medidas estão definidas da mesma forma em toda a análise;
- se a base de comparação é justa;
- se períodos e grupos comparados são equivalentes.

### 2. Verificar qualidade dos dados

Confirmar:

- fonte e data de atualização;
- ausência de lacunas inesperadas;
- tratamento de valores ausentes;
- ausência de contagem duplicada;
- filtros aplicados corretamente;
- unidade de cada linha conhecida;
- chaves de junção adequadas.

### 3. Verificar cálculos

- recalcular amostra de medidas importantes;
- conferir se subtotais fecham com totais;
- conferir percentuais e denominadores;
- conferir comparação entre períodos equivalentes;
- verificar se médias não foram calculadas a partir de médias já agregadas;
- verificar se junções muitos-para-muitos multiplicaram valores;
- conferir conversões de tipo e fuso horário.

### 4. Procurar armadilhas analíticas

Investigar explicitamente:

- **multiplicação por junção**: aumento silencioso de linhas após combinar tabelas;
- **viés de sobrevivência**: ausência de pessoas ou entidades que deixaram de existir na base atual;
- **período incompleto**: comparar parte de uma semana ou mês com período completo;
- **mudança de denominador**: alterar quem é considerado elegível entre períodos;
- **média de médias**: ignorar tamanhos diferentes dos grupos;
- **diferença de fuso horário**: cortes diários incompatíveis entre fontes;
- **viés de seleção**: formar segmentos usando o próprio resultado que se pretende medir;
- **paradoxo de Simpson**: tendência agregada mudar de direção ao segmentar;
- **correlação apresentada como causa**;
- **amostra pequena**;
- **múltiplos testes sem correção**;
- **seleção conveniente de período ou segmento**.

### 5. Avaliar visualizações

- barras começam em zero;
- escalas comparáveis são consistentes;
- títulos descrevem corretamente os dados;
- eixos e unidades estão identificados;
- não há efeito tridimensional ou corte enganoso;
- incerteza está visível quando necessária;
- cores não induzem interpretação incorreta.

### 6. Avaliar narrativa e conclusão

Perguntar:

- a conclusão é diretamente sustentada pelos dados mostrados?
- existem explicações alternativas plausíveis?
- a incerteza foi comunicada?
- a recomendação é proporcional à força da evidência?
- algum dado ausente poderia inverter a conclusão?

### 7. Classificar a confiança

Usar somente três estados:

- **pronto para compartilhar**: método coerente, cálculos verificados e limitações registradas;
- **compartilhar com ressalvas**: resultado útil, mas há limitações que precisam acompanhar a conclusão;
- **precisa de revisão**: erro, problema metodológico ou evidência insuficiente impede uso seguro.

## Formato de saída

```text
Relatório de validação

Avaliação geral: <estado>

Método
<avaliação>

Problemas encontrados
1. gravidade — problema — impacto

Verificações de cálculo
<resultado>

Visualizações
<resultado>

Limitações e possíveis vieses
<lista>

Melhorias necessárias
<lista priorizada>

Ressalvas obrigatórias
<lista>
```

## Verificação de plausibilidade

Para cada número importante, perguntar:

- a ordem de grandeza faz sentido?
- a taxa está dentro de limites possíveis?
- a variação é compatível com o histórico?
- o número bate aproximadamente com outra fonte conhecida?
- uma amostra individual pode ser rastreada até a origem?

Resultados perfeitamente alinhados à hipótese, mudanças muito grandes sem causa aparente, valores exatamente iguais entre períodos ou taxas de 0% e 100% merecem investigação adicional.

## Regra principal

A validação deve tentar encontrar motivos pelos quais a conclusão pode estar errada. Somente depois dessa tentativa a análise pode ser tratada como evidência suficientemente confiável para uma decisão.
