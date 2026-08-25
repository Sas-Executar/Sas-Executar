---
name: analise-estatistica
description: "Aplicar estatística descritiva, análise de tendência, detecção de valores extremos, correlação e testes de hipótese. Usar como referência interna quando a análise exigir interpretação estatística ou avaliação de incerteza."
user-invocable: false
---

# Referência de análise estatística

## Tendência central

Escolher a medida adequada:

| Situação | Medida principal | Motivo |
|---|---|---|
| distribuição aproximadamente simétrica | média | resume bem o centro |
| distribuição assimétrica | mediana | resiste melhor a valores extremos |
| dado categórico ou ordinal | moda | representa a categoria mais frequente |
| distribuição muito assimétrica | média e mediana | a diferença entre ambas revela assimetria |

Para medidas de produto ou negócio, preferir apresentar média e mediana juntas quando a distribuição puder ser assimétrica.

## Dispersão

- **desvio padrão**: variação em torno da média;
- **intervalo interquartil**: distância entre percentis 25 e 75, resistente a valores extremos;
- **coeficiente de variação**: desvio padrão dividido pela média, útil para comparar escalas diferentes;
- **amplitude**: máximo menos mínimo, simples porém muito sensível a extremos.

## Percentis úteis

```text
p1  — limite inferior extremo
p5  — faixa inferior usual
p25 — primeiro quartil
p50 — mediana
p75 — terceiro quartil
p90 — faixa superior frequente
p95 — faixa superior rara
p99 — extremo superior
```

## Descrever uma distribuição

Sempre registrar:

- forma: aproximadamente normal, assimétrica à direita, assimétrica à esquerda, bimodal, uniforme ou cauda pesada;
- centro: média e mediana;
- dispersão;
- quantidade e intensidade de valores extremos;
- limites naturais, como zero ou 100%;
- tamanho da amostra.

## Tendências temporais

Antes de afirmar crescimento ou queda:

1. visualizar a série bruta;
2. procurar sazonalidade semanal, mensal ou anual;
3. comparar períodos equivalentes;
4. verificar mudanças de definição ou instrumentação;
5. usar média móvel apenas para reduzir ruído, sem esconder a série original.

Exemplo em Python:

```python
dados["media_movel_7"] = dados["medida"].rolling(window=7, min_periods=1).mean()
dados["media_movel_28"] = dados["medida"].rolling(window=28, min_periods=1).mean()
```

## Crescimento

```text
crescimento simples = (atual - anterior) / anterior
crescimento composto anual = (final / inicial) ^ (1 / anos) - 1
```

Não calcular taxa quando o denominador for zero ou inadequado. Explicar mudanças de base.

## Previsões simples

Para análises operacionais sem modelo especializado:

- referência ingênua: próximo período igual ao atual;
- referência sazonal: próximo período igual ao equivalente anterior;
- tendência linear: somente quando a série justificar aproximação linear;
- média móvel: somente como referência de curto prazo.

Sempre comunicar intervalo plausível e incerteza. Evitar número pontual com precisão falsa.

## Valores extremos

Não remover automaticamente.

Procedimento:

1. investigar se é erro, valor real extremo ou população diferente;
2. corrigir ou excluir somente erro demonstrável;
3. manter valores reais extremos e usar medida robusta quando necessário;
4. segmentar população diferente quando isso fizer sentido;
5. documentar qualquer exclusão e seu impacto.

Método do intervalo interquartil:

```python
q1 = dados["valor"].quantile(0.25)
q3 = dados["valor"].quantile(0.75)
iqr = q3 - q1
limite_inferior = q1 - 1.5 * iqr
limite_superior = q3 + 1.5 * iqr
extremos = dados[(dados["valor"] < limite_inferior) | (dados["valor"] > limite_superior)]
```

## Testes de hipótese

Usar quando a pergunta for se uma diferença observada pode ser explicada apenas por variação aleatória.

Fluxo:

1. definir hipótese nula;
2. definir hipótese alternativa;
3. escolher nível de significância antes de observar o resultado;
4. escolher teste compatível com tipo de dado e desenho;
5. calcular estatística, valor de probabilidade e intervalo de confiança;
6. interpretar tamanho do efeito, não apenas significância estatística.

| Situação | Teste comum |
|---|---|
| duas médias independentes | teste t independente |
| duas proporções | teste z de proporções |
| antes e depois nas mesmas entidades | teste t pareado |
| três ou mais médias | análise de variância |
| duas distribuições não normais | Mann–Whitney |
| associação entre categorias | qui-quadrado |

## Significância prática

Uma diferença pode ser estatisticamente detectável e ainda ser irrelevante para a decisão.

Sempre informar:

- tamanho do efeito;
- intervalo de confiança;
- tamanho da amostra;
- impacto prático esperado;
- limitações do desenho.

## Cuidados obrigatórios

### Correlação não implica causa

Ao encontrar relação entre A e B, considerar:

- causa reversa;
- terceira variável explicando ambas;
- coincidência;
- viés de seleção;
- mudança de composição da população.

### Múltiplas comparações

Quanto mais hipóteses forem testadas, maior a chance de um resultado aparentemente significativo surgir ao acaso. Registrar quantidade de testes e aplicar correção quando apropriado.

### Paradoxo de Simpson

Verificar se uma tendência agregada permanece ao segmentar por dimensões importantes.

### Viés de sobrevivência

Perguntar quem não aparece no conjunto de dados e se essa ausência poderia alterar a conclusão.

### Falácia ecológica

Não aplicar automaticamente um padrão de grupo a cada indivíduo.

## Regra principal

A estatística deve reduzir incerteza e explicitar limites, não produzir falsa certeza. Resultado estatístico só deve orientar decisão quando método, amostra, efeito e contexto forem compatíveis com a pergunta.
