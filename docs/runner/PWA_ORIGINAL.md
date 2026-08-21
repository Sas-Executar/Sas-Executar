# README original · Sprint Operacional

Fonte histórica: `Executar-26/Sprint-Operacional@7f542c368770978a1a97b7d865c56b5d08ed7aa1`.

A versão migrada pertence ao repositório canônico `Executar-26/next-forge`, está em `apps/app/public/legado/sprint-operacional/` e pode ser aberta em `/legado/sprint-operacional/`.

---

# Sprint Operacional · EXECUTAR FOCO PWA

Aplicativo web instalável para gestão pessoal de projetos e processos, com execução visual orientada por dependências e foco em uma entrega por vez.

## O que funciona

- Visão geral com plano no tempo, capacidade, reserva, 8 rotas e marcos.
- Área Foco com um cartão principal por vez.
- Fila automática somente com entregas já liberadas.
- Área “Ainda não pode” para mostrar dependências pendentes.
- Passos de 15 minutos para acompanhar avanço sem fragmentar o plano.
- Registro de evidência por texto, ligação e arquivo pequeno.
- Calendário de resultados de 24/08 a 04/09.
- Ciclos de 72 horas.
- Caminho visual das dependências.
- Dados salvos no próprio navegador.
- Funcionamento offline depois da primeira abertura.
- Instalação como PWA.

## Estrutura

```text
index.html             interface base
app.css                sistema visual responsivo
app.js                 foco, fila, calendário, dependências e evidências
data.js                plano operacional e predecessores
manifest.webmanifest   instalação como aplicativo
sw.js                  funcionamento offline
icon.svg               ícone do aplicativo
vercel.json            configuração para publicação na Vercel
```

## Executar localmente

O aplicativo deve ser servido por HTTP para que o funcionamento offline seja ativado.

```bash
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`.

## Publicar manualmente na Vercel

1. Importe este repositório na Vercel.
2. Não é necessário comando de construção.
3. O diretório raiz do projeto é a própria raiz do repositório.
4. Publique.

## Persistência

A primeira versão é `local-first`: conclusão, foco, passos e evidências ficam no navegador do dispositivo. Não há conta, sincronização em nuvem ou colaboração nesta fase.

## Regra principal

Uma entrega só entra na fila quando todos os seus predecessores estiverem concluídos. O sistema não libera trabalho apenas para preencher capacidade.
