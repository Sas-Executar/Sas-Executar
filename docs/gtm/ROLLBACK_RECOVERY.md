# Rollback e recovery

## Aplicação Vercel

1. Registrar SHA, deployment candidato, alias e deployment anterior `READY`.
2. Validar o candidato sem promover produção.
3. Em incidente após promoção, repontar o alias para o deployment anterior sem
   rebuild e registrar horário, ator e motivo.
4. Reexecutar health, login e leitura canônica; não considerar rollback apenas
   porque o alias mudou.

Evidência: IDs dos dois deployments, resposta HTTP, logs sem CRITICAL e tempo de
recuperação. Preview não recebe credenciais de produção por padrão.

## Aurora

1. Migrations são aditivas; nenhuma correção destrutiva entra no fluxo normal.
2. Criar snapshot identificável antes de mudança de risco.
3. Restaurar em recurso separado, aplicar migrations versionadas e executar o
   smoke de dois tenants pela Data API.
4. Trocar ARN somente depois da validação; manter origem protegida até sign-off.

Evidência: snapshot, cluster restaurado, checksums das migrations e matriz CRUD.

## S3

1. Block Public Access, criptografia e versionamento permanecem obrigatórios.
2. Recuperar uma versão anterior para chave temporária do mesmo prefixo.
3. Comparar checksum e provar que outra organização recebe negação.
4. Remover a cópia temporária segundo a política de retenção aprovada.

## Agent-007 e integrações

- run `RUNNING` sem heartbeat por dois minutos é fechado como
  `RUN_LEASE_EXPIRED`; não se repete efeito automaticamente;
- webhook Stripe atrasado não pode substituir evento mais recente;
- falha de Liveblocks, Knock ou MCP degrada a integração, não o estado Aurora;
- toda execução de recovery gera incidente, owner e evidência no mesmo SHA.

Este runbook está implementado, mas recovery só passa após o ensaio real.
