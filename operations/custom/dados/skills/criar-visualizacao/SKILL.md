---
name: criar-visualizacao
description: "Criar visualizações de dados adequadas à pergunta, à relação entre variáveis e ao público. Usar para transformar resultados de consultas ou arquivos em gráficos claros, precisos e acessíveis."
argument-hint: "<fonte de dados> [tipo de gráfico]"
---

# /criar-visualizacao — criar gráficos a partir de dados

> Para conectores disponíveis, consulte `../../CONECTORES.md`.

## Uso

```text
/criar-visualizacao <fonte de dados> [tipo de gráfico] [instruções adicionais]
```

## Fluxo

### 1. Entender o pedido

Identificar:

- fonte de dados;
- pergunta que o gráfico deve responder;
- tipo de relação: tendência, comparação, composição, distribuição, correlação, posição geográfica ou fluxo;
- público;
- finalidade: exploração, apresentação, relatório ou componente de painel;
- necessidade de interação, ampliação ou filtros.

### 2. Obter e preparar os dados

**Com `~~armazem-dados` conectado:** escrever e executar a consulta necessária e carregar somente as colunas relevantes.

**Com arquivo ou dados colados:** carregar, converter tipos e tratar valores ausentes de forma explícita.

Nunca alterar silenciosamente valores apenas para melhorar a aparência do gráfico.

### 3. Escolher o gráfico

| Relação | Visualização recomendada |
|---|---|
| tendência ao longo do tempo | linha |
| comparação entre categorias | barras |
| classificação | barras horizontais |
| composição | barras empilhadas |
| composição ao longo do tempo | área ou barras empilhadas |
| distribuição | histograma ou caixa |
| correlação entre duas variáveis | dispersão |
| muitas correlações | mapa de calor |
| padrão geográfico | mapa coroplético |
| fluxo | diagrama de Sankey |
| desempenho contra meta | marcador de desempenho |

Evitar gráfico de setores quando houver muitas categorias. Nunca usar efeito tridimensional para representar valores. Usar dois eixos apenas quando indispensável e com indicação explícita.

### 4. Gerar a visualização

Para saída estática, priorizar Python com `matplotlib`. Para interação solicitada, pode ser usado Plotly.

O código deve:

- ter título que comunique a principal mensagem;
- nomear eixos e unidades;
- formatar percentuais, moeda e números grandes de forma legível;
- ordenar categorias de maneira significativa;
- evitar elementos decorativos sem informação;
- salvar o arquivo com nome descritivo;
- preservar dados e método suficientes para reprodução.

Exemplo estrutural:

```python
import matplotlib.pyplot as plt

figura, eixo = plt.subplots(figsize=(10, 6))
eixo.plot(dados["data"], dados["valor"], linewidth=2)
eixo.set_title("Evolução da medida no período")
eixo.set_xlabel("Data")
eixo.set_ylabel("Valor")
eixo.spines["top"].set_visible(False)
eixo.spines["right"].set_visible(False)
figura.tight_layout()
figura.savefig("evolucao_medida.png", dpi=150, bbox_inches="tight")
```

### 5. Aplicar princípios de projeto visual

- cor deve codificar informação, não decorar;
- destacar somente o ponto ou tendência relevante;
- usar contraste suficiente;
- não depender apenas de vermelho e verde;
- ordenar barras por valor quando não houver ordem natural;
- manter escalas comparáveis entre gráficos relacionados;
- barras devem iniciar em zero;
- linhas podem usar outra base somente quando isso não distorcer a interpretação;
- mostrar incerteza quando existir;
- evitar precisão numérica falsa.

### 6. Garantir acessibilidade

- não depender somente de cor;
- usar rótulos, padrões ou estilos de linha quando necessário;
- fornecer descrição textual do achado principal;
- oferecer tabela de dados quando o gráfico for importante para compreensão;
- usar tamanho de texto legível;
- testar se a leitura continua possível em escala de cinza.

### 7. Entregar

1. mostrar a visualização;
2. informar a principal leitura permitida pelos dados;
3. indicar fonte e período;
4. fornecer o código utilizado quando apropriado;
5. indicar limitações ou escolhas visuais que possam afetar interpretação.

## Regra principal

O gráfico deve facilitar uma interpretação correta. Nunca ajustar eixo, intervalo, cor ou seleção de dados de forma que exagere uma diferença ou esconda incerteza.
