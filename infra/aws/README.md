# AWS · EXECUTAR

Esta stack cria a fundação AWS do SaaS sem expor o Aurora à internet.

## Recursos

- VPC e duas sub-redes privadas, sem NAT ou Internet Gateway.
- Aurora PostgreSQL Serverless v2 com Data API, criptografia, backups e pausa em 0 ACU.
- Secrets Manager para as credenciais master e de runtime.
- S3 privado, criptografado, versionado e com bloqueio público integral.
- OIDC da Vercel e role de runtime com acesso mínimo a Data API, secret e bucket.

O provider GitHub Actions OIDC existente e a role
`arn:aws:iam::250892133959:role/executar-github-bootstrap` não são recriados.

## Aplicação

O workflow `.github/workflows/aws-infra.yml` assume a role existente, valida o
template, escolhe uma versão Aurora PostgreSQL 16 disponível em `sa-east-1`,
aplica a stack e executa as migrações versionadas pela Data API.

O Aurora não fornece uma `DATABASE_URL` alcançável diretamente pela Vercel no
plano atual. A integração correta usa a Data API e credenciais temporárias
obtidas pelo OIDC da Vercel. Não abra a porta 5432 para `0.0.0.0/0`.

## Custos e retenção

- O writer pausa após cinco minutos ocioso e pode escalar de 0 a 1 ACU.
- Snapshots do Aurora e objetos do bucket são retidos quando a stack é removida.
- `DeletionProtection` permanece ativada no cluster.
