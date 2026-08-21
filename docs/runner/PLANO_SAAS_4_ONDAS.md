# Plano SaaS · 4 Ondas

## Objetivo

Evoluir o `Sprint-Operacional` atual para uma fundação SaaS pronta para GTM/MVP, preservando o produto visual e a regra “Próximo 1 por vez”, enquanto substitui progressivamente armazenamento local e código monolítico por uma base multi-tenant, sincronizada, segura, observável e extensível para Copiloto/IA/MCP/mobile.

## Repositório canônico e referência funcional

- Repositório canônico: `Executar-26/next-forge`.
- A PWA original veio de `Executar-26/Sprint-Operacional` e está preservada em `apps/app/public/legado/sprint-operacional/`.
- O starter SaaS já existe; a Onda 1 deve adaptar os pacotes presentes em vez de inicializar outro monorepo.
- O acesso funcional ao legado permanece disponível em `/legado/sprint-operacional/`.

## Decisões arquiteturais travadas

- Repositório de execução: `Executar-26/next-forge`.
- O código atual permanece como referência funcional até a migração ser comprovada.
- `next-forge` é o chassis SaaS recomendado.
- Clerk é a autoridade de identidade, organizações, membros, convites e sessões.
- Supabase é a plataforma de dados: Postgres, RLS, Storage e Realtime.
- Stripe é a base de cobrança/direitos de acesso.
- Vercel AI SDK é a base do Copiloto/agentes.
- MCP é o contrato de ferramentas/integrações.
- Expo é o caminho mobile para Android e iOS.
- Vercel é a plataforma de publicação.

---

# ONDA 1 · FUNDAÇÃO SAAS + PRESERVAÇÃO DO PRODUTO

## Resultado da onda

Ter o novo chassis SaaS executando no mesmo repositório, com identidade, organizações, banco seguro, CI e observabilidade, sem perder a PWA atual nem seu comportamento.

## Trabalho

1. Auditar o estado atual antes de qualquer migração.
2. Adaptar o monorepo `next-forge` já existente, preservando sua estrutura e reaproveitando seus pacotes.
3. Preservar a PWA atual em uma área de referência/legado durante a transição; não apagá-la.
4. Configurar aplicações e pacotes mínimos do monorepo.
5. Configurar Clerk.
6. Configurar Supabase.
7. Implementar modelo de organização local associado ao `clerk_org_id`.
8. Implementar RLS baseada na organização ativa.
9. Adicionar Storage para evidências.
10. Adicionar CI obrigatório: instalação, tipos, lint, testes e build.
11. Adicionar observabilidade mínima de erro.
12. Adicionar headers/CSP/rate limiting adequado às rotas mutantes.
13. Criar testes de isolamento multi-tenant antes de portar dados reais.

## Gate 1

PASSA somente se:

- login funciona;
- organização funciona;
- usuário A não lê/escreve dados da organização B;
- banco e Storage respeitam isolamento;
- CI fica verde;
- build Vercel funciona;
- PWA atual continua recuperável como referência funcional.

---

# ONDA 2 · PRODUTO OPERACIONAL + DADOS + COBRANÇA

## Resultado da onda

Reproduzir no novo SaaS tudo que hoje torna o Sprint Operacional útil, agora persistido e sincronizado na nuvem.

## Trabalho

1. Extrair regras atualmente embutidas em `app.js` para módulos de domínio reutilizáveis:
   - dependências;
   - fila liberada;
   - foco;
   - conclusão;
   - evidência;
   - capacidade;
   - ciclos de 72 horas.
2. Portar as quatro faces atuais:
   - Visão Geral;
   - Foco;
   - Calendário;
   - Caminho.
3. Manter linguagem orientada à ação:
   - Faça agora;
   - Pode fazer depois;
   - Ainda não pode;
   - Feito;
   - Comprovar.
4. Substituir `data.js` como fonte de verdade por banco tipado, mantendo-o apenas como modelo/importação inicial quando útil.
5. Substituir `localStorage` como autoridade por estratégia local-first + sincronização.
6. Persistir projetos, entregas, dependências, progresso e evidências.
7. Implementar upload/consulta de evidências no Storage.
8. Usar Realtime somente onde melhora de fato o estado do produto.
9. Integrar Stripe usando os padrões do starter.
10. Associar direitos de acesso ao tenant/organização sem espalhar lógica de plano pela UI.
11. Refinar responsividade:
    - celular = Foco primeiro;
    - tablet = Foco + contexto;
    - desktop = painel completo.
12. Melhorar acessibilidade, estados de carregamento, erro, vazio e reconexão.

## Gate 2

PASSA somente se:

- usuário abre outro aparelho e encontra o mesmo projeto/estado;
- fila depende do estado real persistido;
- conclusão libera sucessores corretamente;
- evidência pode ser criada e recuperada;
- offline não perde trabalho local;
- retorno à rede sincroniza sem duplicação silenciosa;
- cobrança e direitos de acesso não quebram o fluxo gratuito/básico;
- fluxos atuais possuem equivalência funcional comprovada.

---

# ONDA 3 · COPILOTO, AGENTE E MCP

## Resultado da onda

Transformar o Copiloto em uma interface de IA embarcada que lê e opera o mesmo estado do produto, sem criar um chatbot desconectado.

## Trabalho

1. Criar pacote `ai` para modelos, prompts, schemas, avaliações e geração de plano.
2. Criar pacote `agent` para o agente principal e subrotinas necessárias.
3. Criar pacote `skills` e portar a skill do Copiloto EXECUTAR como contrato comportamental.
4. Implementar chat embarcado no aplicativo.
5. Implementar comandos equivalentes às ações canônicas, incluindo:
   - `/bomdia`;
   - `/agora`;
   - `/estado`;
   - `/fechardia`;
   - `/replanejamento`.
6. O agente deve consultar estado real antes de responder perguntas operacionais.
7. Implementar ferramentas internas para:
   - criar/editar plano;
   - consultar fila;
   - assumir foco;
   - registrar progresso;
   - registrar evidência;
   - concluir entrega;
   - replanejar;
   - consultar calendário/caminho.
8. Implementar cliente/servidor MCP conforme necessário.
9. Separar ferramentas de leitura, escrita reversível e escrita relevante/irreversível.
10. Exigir aprovação humana para ações relevantes quando apropriado.
11. Registrar trilha de auditoria das ações do agente.
12. Implementar limites de passos, custo, tempo e repetição.
13. Preparar adaptadores para ferramentas externas sem adicionar integrações genéricas sem demanda.
14. Adicionar avaliações mínimas para respostas e ações críticas.

## Gate 3

PASSA somente se:

- “O que faço agora?” é respondido pelo estado real;
- agente não ignora dependências;
- agente não opera em tenant incorreto;
- ações de escrita são auditadas;
- operações críticas pedem aprovação quando definido;
- agente consegue criar, consultar, atualizar e replanejar um plano ponta a ponta;
- ferramentas MCP respeitam autenticação/tenant;
- falhas do modelo não corrompem estado canônico.

---

# ONDA 4 · COLABORAÇÃO + MOBILE + GTM/PRODUÇÃO

## Resultado da onda

Transformar o SaaS validado em produto distribuível: colaboração útil, Android/iOS e superfície de GTM/produção.

## Trabalho

1. Adicionar colaboração somente em pontos com benefício claro:
   - presença;
   - comentários;
   - menções;
   - atualização compartilhada de estado.
2. Adicionar notificações transacionais e operacionais mínimas.
3. Criar `apps/mobile` com Expo compartilhando domínio, cliente de API, schemas e tokens visuais possíveis.
4. Implementar autenticação móvel compatível com a autoridade de identidade escolhida.
5. Portar Foco, Calendário, Evidências e demais fluxos prioritários para mobile.
6. Preparar câmera/arquivos quando forem necessários ao registro de evidências.
7. Implementar pipeline EAS para Android e iOS.
8. Atender requisitos reais de Google Play e Apple App Store no momento da submissão.
9. Manter PWA instalável no web.
10. Finalizar site/GTM, onboarding, preços e análise de uso.
11. Adicionar módulos CRM/ERP mínimo/marketplace somente quando houver requisito concreto; usar o mesmo domínio/autenticação/pagamentos, não novos produtos.
12. Fazer auditoria de produção: segurança, performance, banco, custo, observabilidade, acessibilidade, recuperação e privacidade.

## Gate 4

PASSA somente se:

- web está estável em produção;
- colaboração não viola isolamento;
- mobile usa o mesmo estado canônico;
- Android/iOS possuem builds reproduzíveis;
- onboarding e cobrança funcionam;
- erros de produção são observáveis;
- política de dados/privacidade corresponde ao comportamento real;
- produto pode receber usuários sem operação manual constante.

---

# Caminho crítico

```text
chassis
  ↓
identidade/organização
  ↓
RLS/dados
  ↓
regras de execução
  ↓
persistência/sincronização
  ↓
Copiloto/agente
  ↓
MCP/ferramentas
  ↓
mobile/GTM
```

Stripe, colaboração, notificações e módulos de negócio devem ser puxados apenas quando seus predecessores estiverem prontos; não devem interromper o caminho crítico para “preencher capacidade”.

# Política de escopo

Não criar por antecipação:

- microserviços sem necessidade comprovada;
- aplicativos separados para CRM/ERP/marketplace;
- duplicação de membership/autenticação;
- integrações genéricas sem caso real;
- sistema visual novo quando o atual puder ser portado/refinado;
- abstrações sem segundo consumidor real.

O objetivo é velocidade para GTM com fundação forte, não quantidade de arquitetura.
