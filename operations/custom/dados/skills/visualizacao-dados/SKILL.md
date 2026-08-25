---
name: visualizacao-dados
description: "Orientar escolha de gráficos, padrões de código Python, princípios de projeto visual e acessibilidade para representações de dados claras e precisas."
user-invocable: false
---

# Referência de visualização de dados

## Escolha por relação dos dados

| O que precisa ser mostrado | Visualização principal | Alternativas |
|---|---|---|
| tendência no tempo | linha | área quando houver composição acumulada |
| comparação entre categorias | barras | barras horizontais quando houver muitas categorias |
| classificação | barras horizontais | pontos |
| composição | barras empilhadas | mapa de retângulos para hierarquia |
| composição no tempo | área empilhada | barras empilhadas em 100% |
| distribuição | histograma | caixa, violino ou pontos |
| correlação de duas variáveis | dispersão | bolhas para terceira medida |
| muitas correlações | mapa de calor | matriz de pares |
| padrão geográfico | mapa coroplético | mapa de pontos |
| fluxo | Sankey | funil para etapas sequenciais |
| desempenho contra meta | marcador de desempenho | mostrador apenas para uma medida isolada |
| várias medidas simultâneas | pequenos múltiplos | painel com gráficos separados |

## Evitar

- setores com muitas categorias;
- gráficos tridimensionais;
- dois eixos sem necessidade clara;
- barras empilhadas com muitas categorias intermediárias difíceis de comparar;
- escalas diferentes em gráficos que deveriam ser comparados diretamente.

## Princípios de cor

- usar cor para codificar dado, não para decorar;
- destacar somente o principal achado;
- usar escala sequencial para valores ordenados;
- usar escala divergente quando houver ponto central significativo;
- limitar quantidade de cores categóricas;
- não depender apenas de vermelho e verde;
- fornecer rótulo ou padrão adicional quando a cor for essencial.

## Tipografia

- título deve comunicar o achado principal;
- subtítulo pode informar período, filtro e fonte;
- eixos devem ter unidade;
- evitar rótulos girados em 90 graus quando houver alternativa;
- usar rótulos de dados apenas onde aumentarem clareza;
- anotações devem apontar eventos ou mudanças relevantes.

## Composição

- remover grades, bordas e fundos sem função informativa;
- ordenar categorias por valor quando não houver ordem natural;
- usar proporção mais larga para séries temporais;
- preservar espaço em branco;
- manter escala comum quando houver comparação entre painéis.

## Precisão

- barras começam em zero;
- linha pode usar base diferente se isso não exagerar a variação;
- indicar intervalos de confiança ou faixas quando houver incerteza;
- arredondar valores de maneira compatível com a precisão real;
- nunca cortar série ou período apenas para reforçar uma narrativa.

## Acessibilidade

Antes de compartilhar, verificar:

- o gráfico continua compreensível sem cor;
- textos são legíveis em ampliação comum;
- título descreve a mensagem;
- eixos e unidades estão identificados;
- fonte e período aparecem;
- há descrição textual do principal achado;
- quando necessário, existe tabela alternativa com os dados;
- o resultado continua útil em escala de cinza.

## Padrão Python recomendado

```python
import matplotlib.pyplot as plt

figura, eixo = plt.subplots(figsize=(10, 6))

eixo.plot(
    dados["data"],
    dados["valor"],
    linewidth=2,
)

eixo.set_title("Evolução da medida")
eixo.set_xlabel("Data")
eixo.set_ylabel("Valor")
eixo.spines["top"].set_visible(False)
eixo.spines["right"].set_visible(False)

figura.tight_layout()
figura.savefig("evolucao_medida.png", dpi=150, bbox_inches="tight")
```

## Regra principal

A visualização deve preservar a verdade quantitativa. Se uma escolha de escala, cor, forma ou recorte puder mudar a interpretação de uma pessoa apressada, essa escolha precisa ser revista ou explicitamente justificada.
