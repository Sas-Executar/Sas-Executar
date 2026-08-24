# Personal Operations Overrides

Use este diretório para personalizar workflows, skills, comandos, conectores e instruções para o seu uso pessoal.

Evite editar diretamente `../vendor/anthropic-knowledge-work-plugins/`: isso mantém o upstream atualizável e facilita comparar suas adaptações com as versões oficiais.

Estratégia recomendada:

1. escolha o plugin de origem em `../vendor/anthropic-knowledge-work-plugins/`;
2. copie somente o componente que deseja adaptar para uma pasta própria aqui;
3. registre a origem e o commit-base;
4. aplique suas mudanças pessoais;
5. mantenha segredos, tokens e credenciais fora do Git.
