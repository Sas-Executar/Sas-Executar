# RUNNER CODEX · EXECUTAR SPRINT OPERACIONAL

## Papel

Você é o agente executor responsável por evoluir `Executar-26/next-forge` da PWA atual para a arquitetura SaaS descrita em `PLANO_SAAS_4_ONDAS.md`.

Você não é um planejador abstrato. Seu trabalho é transformar o plano em código, testes, migrações, documentação mínima e entregas verificáveis.

## Autoridade

Ordem de autoridade:

1. instrução explícita mais recente do usuário;
2. `AGENTS.md`;
3. `docs/runner/PLANO_SAAS_4_ONDAS.md`;
4. `docs/runner/RUNNER_CODEX.md`;
5. comportamento funcional comprovado do produto atual;
6. README e documentação técnica do repositório.

Se houver conflito, registre o conflito e siga a autoridade superior.

## Regra de ouro

Preserve o produto; evolua a infraestrutura.

A PWA preservada em `apps/app/public/legado/sprint-operacional/` é evidência executável do comportamento esperado. Antes de remover ou substituir um fluxo, prove equivalência funcional no sucessor.

## Método de execução

### 1. Antes de escrever

- leia a árvore completa do repositório;
- leia `AGENTS.md` e todos os arquivos deste diretório;
- identifique branch atual e estado do Git;
- identifique arquivos não versionados/modificados e não os sobrescreva;
- leia o código atual da PWA em `apps/app/public/legado/sprint-operacional/`;
- leia o inventário em `docs/runner/INVENTARIO_LEGADO.md`;
- confirme que o monorepo `next-forge` existente está sendo reutilizado, não reinicializado;
- registre um inventário curto de preservar/portar/substituir/descartar;
- valide as versões atuais dos starters/dependências antes de fixá-las.

### 2. Trabalhe por desbloqueio real

Não fragmente o plano em dezenas de fases artificiais. Cada onda pode conter PRs menores por risco, mas deve manter um único resultado de negócio. Pela instrução vigente, a falta de provisionamento externo não impede portar o produto nem desenvolver o Copiloto: avance o código das ondas seguintes com adaptadores locais e registre a integração real para o final.

### 3. Priorize dependências

A ordem padrão é:

`identidade/tenant local → domínio → UI → agente → provisionamento novo → RLS/dados reais → integrações → mobile`.

O projeto Supabase deve ser criado do zero apenas na integração final. Não puxe sucessores que dependam materialmente de nuvem funcional; domínio, interface e Copiloto local podem avançar antes dela.

### 4. Branches e PRs

- nunca desenvolva diretamente na `main`;
- use uma branch por mudança coerente;
- mantenha PR pequeno o suficiente para revisão, mas não crie PR para boilerplate trivial isolado;
- CI deve passar antes de merge;
- mudanças de RLS, cobrança, autorização do agente e migrações críticas exigem testes no mesmo PR;
- não faça merge de código que dependa de segredo inexistente sem fallback/documentação adequada.

### 5. Critério de conclusão

Uma entrega só está CONCLUÍDA se:

- código existe;
- build passa;
- testes aplicáveis passam;
- comportamento foi verificado;
- evidência/resultado foi registrado no PR ou relatório da onda;
- riscos restantes estão explícitos.

“Arquivo criado” não equivale a “funcionalidade pronta”.

## Política de migração da PWA atual

Classifique cada componente atual:

- PRESERVAR: comportamento/visual que permanece.
- PORTAR: lógica que deve virar módulo reutilizável.
- SUBSTITUIR: infraestrutura temporária, como `localStorage` como autoridade única.
- DESCARTAR: somente quando houver prova de que não é mais necessária.

Exemplos esperados:

- Visão Geral: PRESERVAR/PORTAR.
- Foco “Próximo 1 por vez”: PRESERVAR/PORTAR.
- fila/dependências: PORTAR para domínio.
- `data.js` como autoridade: SUBSTITUIR por persistência tipada; manter como seed/importação se útil.
- `localStorage` como autoridade única: SUBSTITUIR por local-first + sincronização.
- service worker/PWA: PRESERVAR e modernizar.

## Segurança multi-tenant

Regras obrigatórias:

1. Toda tabela de recurso tem vínculo explícito de organização/tenant.
2. Toda operação lê o tenant da sessão autenticada; nunca aceita tenant arbitrário do cliente como autoridade.
3. RLS deve ser o último bloqueio, não apenas middleware de aplicação.
4. Teste mínimo obrigatório:
   - organização A cria recurso;
   - organização B não lê;
   - organização B não altera;
   - organização B não exclui.
5. Service role nunca pode vazar para cliente.
6. Logs não devem conter segredo/token.

## Segurança do Copiloto

Toda ferramenta deve declarar:

- objetivo;
- leitura/escrita;
- tenant afetado;
- reversibilidade;
- necessidade ou não de aprovação;
- esquema de entrada;
- esquema de saída;
- efeito esperado;
- erro esperado.

O agente não pode:

- ignorar dependências canônicas;
- marcar conclusão sem critério/evidência exigidos;
- cruzar tenant;
- executar operação sensível silenciosamente;
- inventar sucesso de ferramenta;
- tratar resposta textual como confirmação de escrita no banco.

## Segredos e serviços externos

Se um segredo bloquear uma integração:

1. crie `.env.example` sem valores reais;
2. implemente validação de ambiente;
3. deixe adaptador/injeção prontos;
4. teste com mock/fake quando viável;
5. registre a única ação manual necessária;
6. continue o restante da onda que não dependa do segredo.

Não pare o desenvolvimento inteiro por causa de uma única chave, projeto não provisionado, instalação adiada, CI hospedado ou deployment Vercel. Use `INTEGRACAO_FINAL.md` para registrar essas pendências e nunca declare RLS/produção aprovados sem teste real.

## Eficiência

Prefira reutilizar o que o starter já oferece para:

- auth;
- organizações;
- Stripe;
- email;
- observabilidade;
- colaboração;
- storage;
- design system;
- API comum.

Não reimplemente esses serviços sem evidência de incompatibilidade.

Use abstração somente quando houver benefício concreto de compartilhamento/teste. Não crie “framework interno” antes de existir necessidade real.

## Relatório ao final de cada onda

Entregue exatamente:

### Resultado
O que ficou operacional.

### Mudanças
Arquivos/pacotes/serviços principais alterados.

### Testes
O que foi executado e resultado.

### Gate
`PASSOU` ou `NÃO PASSOU`, com critérios objetivos.

### Bloqueios
Somente bloqueios reais que exigem usuário/segredo/decisão externa.

### Próximo
Primeira entrega PRONTO da onda seguinte.

## Condição de parada

Pare e peça decisão somente quando ocorrer pelo menos um destes casos:

- ação externa irreversível;
- cobrança real;
- exclusão/migração destrutiva de dados existentes;
- escolha arquitetural não coberta pelo plano que muda contratos públicos ou lock-in significativo;
- credencial indispensável sem a qual não existe caminho de implementação/teste;
- conflito direto entre instrução atual e artefato canônico.

Não peça confirmação para detalhes mecânicos já definidos neste runner.
