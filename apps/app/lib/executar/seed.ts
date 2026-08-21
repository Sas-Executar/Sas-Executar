import type { Entrega } from "./domain";

export const ENTREGAS_SPRINT: readonly Entrega[] = [
  {
    "id": "APP-01",
    "title": "Fechar a base segura do aplicativo",
    "front": "Desenvolvimento",
    "date": "24/08",
    "mins": 180,
    "deps": [],
    "stage": 1
  },
  {
    "id": "BUS-01",
    "title": "Fechar posicionamento e mensagem",
    "front": "Operações",
    "date": "24/08",
    "mins": 90,
    "deps": [],
    "stage": 1
  },
  {
    "id": "PHY-01",
    "title": "Escolher 3 produtos físicos",
    "front": "Operações",
    "date": "24/08",
    "mins": 15,
    "deps": [],
    "stage": 1
  },
  {
    "id": "INF-01",
    "title": "Escolher 3 infoprodutos",
    "front": "Operações",
    "date": "24/08",
    "mins": 15,
    "deps": [],
    "stage": 1
  },
  {
    "id": "CONS-01",
    "title": "Escolher 3 serviços",
    "front": "Operações",
    "date": "24/08",
    "mins": 15,
    "deps": [],
    "stage": 1
  },
  {
    "id": "BUS-02",
    "title": "Fechar o mapa das ofertas",
    "front": "Operações",
    "date": "24/08",
    "mins": 30,
    "deps": [
      "BUS-01",
      "PHY-01",
      "INF-01",
      "CONS-01"
    ],
    "stage": 1
  },
  {
    "id": "APP-02",
    "title": "Fechar conta, acesso e uso por pessoas diferentes",
    "front": "Desenvolvimento",
    "date": "25/08",
    "mins": 240,
    "deps": [
      "APP-01"
    ],
    "stage": 1
  },
  {
    "id": "BUS-03",
    "title": "Fechar preços e condições",
    "front": "Operações",
    "date": "25/08",
    "mins": 30,
    "deps": [
      "BUS-02"
    ],
    "stage": 1
  },
  {
    "id": "BUS-04",
    "title": "Fechar canais e lançamento",
    "front": "Operações",
    "date": "25/08",
    "mins": 45,
    "deps": [
      "BUS-01",
      "BUS-02",
      "BUS-03"
    ],
    "stage": 1
  },
  {
    "id": "DAT-01",
    "title": "Definir o que precisa ser medido",
    "front": "Operações",
    "date": "25/08",
    "mins": 15,
    "deps": [
      "BUS-02",
      "BUS-04"
    ],
    "stage": 1
  },
  {
    "id": "DAT-02",
    "title": "Organizar os registros de medição",
    "front": "Operações",
    "date": "25/08",
    "mins": 30,
    "deps": [
      "DAT-01"
    ],
    "stage": 1
  },
  {
    "id": "APP-03",
    "title": "Trazer as partes reutilizáveis do produto",
    "front": "Desenvolvimento",
    "date": "26/08",
    "mins": 180,
    "deps": [
      "APP-02"
    ],
    "stage": 1
  },
  {
    "id": "BLOG-01",
    "title": "Colocar a base do blog em funcionamento",
    "front": "Desenvolvimento",
    "date": "26/08",
    "mins": 60,
    "deps": [
      "BUS-01"
    ],
    "stage": 1
  },
  {
    "id": "CONS-02",
    "title": "Fechar oferta e entrega dos 3 serviços",
    "front": "Operações",
    "date": "26/08",
    "mins": 90,
    "deps": [
      "CONS-01",
      "BUS-01"
    ],
    "stage": 1
  },
  {
    "id": "BLOG-02",
    "title": "Fechar os 3 artigos principais",
    "front": "Criativo",
    "date": "31/08",
    "mins": 150,
    "deps": [
      "BUS-01"
    ],
    "stage": 2
  },
  {
    "id": "APP-04",
    "title": "Conectar regras, dados e funcionamento do produto",
    "front": "Desenvolvimento",
    "date": "27/08",
    "mins": 390,
    "deps": [
      "APP-02",
      "APP-03"
    ],
    "stage": 2
  },
  {
    "id": "APP-05",
    "title": "Colocar o aplicativo no ar e provar o uso",
    "front": "Desenvolvimento",
    "date": "28/08",
    "mins": 90,
    "deps": [
      "APP-04"
    ],
    "stage": 2
  },
  {
    "id": "SHOW-01",
    "title": "Escolher provas reais para mostrar",
    "front": "Operações",
    "date": "28/08",
    "mins": 15,
    "deps": [
      "APP-05"
    ],
    "stage": 2
  },
  {
    "id": "SHOW-02",
    "title": "Produzir 3 vídeos de prova",
    "front": "Criativo",
    "date": "28/08",
    "mins": 180,
    "deps": [
      "SHOW-01"
    ],
    "stage": 2
  },
  {
    "id": "SHOW-03",
    "title": "Produzir 3 comparativos visuais",
    "front": "Criativo",
    "date": "31/08",
    "mins": 120,
    "deps": [
      "SHOW-01"
    ],
    "stage": 2
  },
  {
    "id": "CONS-03",
    "title": "Montar proposta e apresentação dos serviços",
    "front": "Criativo",
    "date": "31/08",
    "mins": 105,
    "deps": [
      "CONS-02"
    ],
    "stage": 2
  },
  {
    "id": "PHY-02",
    "title": "Registrar os 3 produtos físicos",
    "front": "Operações",
    "date": "01/09",
    "mins": 90,
    "deps": [
      "PHY-01"
    ],
    "stage": 3
  },
  {
    "id": "PHY-03",
    "title": "Fechar compra, entrega e suporte dos produtos",
    "front": "Operações",
    "date": "01/09",
    "mins": 75,
    "deps": [
      "PHY-02",
      "BUS-03"
    ],
    "stage": 3
  },
  {
    "id": "INF-02",
    "title": "Produzir os 3 infoprodutos",
    "front": "Criativo",
    "date": "01/09",
    "mins": 150,
    "deps": [
      "INF-01",
      "BUS-01"
    ],
    "stage": 3
  },
  {
    "id": "INF-03",
    "title": "Fechar pagamento, acesso e entrega digital",
    "front": "Operações",
    "date": "02/09",
    "mins": 120,
    "deps": [
      "INF-02",
      "BUS-03"
    ],
    "stage": 3
  },
  {
    "id": "DAT-03",
    "title": "Ligar a medição ao fluxo real",
    "front": "Desenvolvimento",
    "date": "02/09",
    "mins": 120,
    "deps": [
      "DAT-02",
      "APP-05",
      "BLOG-01",
      "CONS-02",
      "PHY-02",
      "INF-02"
    ],
    "stage": 3
  },
  {
    "id": "BLOG-03",
    "title": "Produzir 3 campanhas completas",
    "front": "Criativo",
    "date": "02/09",
    "mins": 225,
    "deps": [
      "BLOG-02",
      "SHOW-02",
      "SHOW-03",
      "BUS-02"
    ],
    "stage": 3
  },
  {
    "id": "BLOG-04",
    "title": "Publicar campanhas e registrar resultado",
    "front": "Operações",
    "date": "03/09",
    "mins": 75,
    "deps": [
      "BLOG-01",
      "BLOG-03",
      "DAT-03",
      "BUS-04"
    ],
    "stage": 3
  },
  {
    "id": "SHOW-04",
    "title": "Publicar o mostruário",
    "front": "Operações",
    "date": "03/09",
    "mins": 30,
    "deps": [
      "SHOW-02",
      "SHOW-03",
      "BUS-04",
      "DAT-03"
    ],
    "stage": 3
  },
  {
    "id": "CONS-04",
    "title": "Abrir contratação dos serviços",
    "front": "Operações",
    "date": "03/09",
    "mins": 60,
    "deps": [
      "CONS-02",
      "CONS-03",
      "BUS-03",
      "BUS-04",
      "DAT-03"
    ],
    "stage": 3
  },
  {
    "id": "PHY-04",
    "title": "Publicar e testar os 3 produtos físicos",
    "front": "Operações",
    "date": "03/09",
    "mins": 75,
    "deps": [
      "PHY-03",
      "BUS-04",
      "DAT-03"
    ],
    "stage": 3
  },
  {
    "id": "INF-04",
    "title": "Publicar e testar os 3 infoprodutos",
    "front": "Operações",
    "date": "03/09",
    "mins": 75,
    "deps": [
      "INF-03",
      "BUS-04",
      "DAT-03"
    ],
    "stage": 3
  },
  {
    "id": "DAT-04",
    "title": "Fechar indicadores e evidências",
    "front": "Operações",
    "date": "04/09",
    "mins": 75,
    "deps": [
      "DAT-03",
      "BLOG-04",
      "SHOW-04",
      "CONS-04",
      "PHY-04",
      "INF-04"
    ],
    "stage": 4
  }
];

