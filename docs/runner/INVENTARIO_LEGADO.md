# Inventário do legado · Sprint Operacional

## Proveniência

- Origem: `Executar-26/Sprint-Operacional`.
- Commit de referência: `7f542c368770978a1a97b7d865c56b5d08ed7aa1`.
- Repositório canônico: `Sas-Executar/Sas-Executar`.
- Local preservado: `apps/app/public/legado/sprint-operacional/`.
- Rota funcional: `/legado/sprint-operacional/`.

| Classe | Componente | Decisão |
| --- | --- | --- |
| PRESERVAR | Visão Geral, Foco, Calendário e Caminho | Manter nomenclatura, comportamento e modelo visual aprovados. |
| PRESERVAR | Fila liberada e “Ainda não pode” | Nenhum item começa antes de seus predecessores. |
| PRESERVAR | Evidências, passos de 15 minutos e ciclos de 72 horas | Manter registro e progressão operacional. |
| PRESERVAR | PWA, manifesto, service worker e funcionamento offline | Escopo legado isolado em `/legado/sprint-operacional/`. |
| PORTAR | Regras de foco, dependências, avanço e conclusão | Extrair para domínio somente na Onda 2. |
| PORTAR | `data.js` e suas 33 entregas | Reaproveitar como seed/importação quando o modelo persistente existir. |
| SUBSTITUIR | `localStorage` como fonte de verdade exclusiva | Adotar persistência multi-tenant e sincronização após a fundação segura. |
| SUBSTITUIR | Neon, Vercel Blob e o adaptador Supabase intermediário como fornecedores finais | Usar Aurora PostgreSQL privado via Data API e S3, preservando Clerk como autoridade. |
| DESCARTAR | Nenhum componente funcional | Remoção proibida antes da equivalência comprovada. |

## Arquivos preservados

- `index.html`: estrutura e linguagem do produto.
- `app.css`: identidade visual e responsividade.
- `app.js`: execução, fila, evidências e instalação PWA.
- `data.js`: plano operacional e dependências.
- `manifest.webmanifest`: instalação no escopo legado.
- `sw.js`: cache e funcionamento offline sem controlar o SaaS.
- `icon.svg`: identidade visual original.
- `docs/runner/VERCEL_LEGADO.json`: configuração original da publicação estática.
- `docs/runner/PWA_ORIGINAL.md`: README histórico e instruções originais do produto.

As únicas adaptações funcionais da PWA nesta migração são URLs, manifesto, escopo do service worker e isolamento de cache, necessárias para coexistir com o aplicativo Next.js no mesmo domínio.
