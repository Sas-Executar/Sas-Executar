# Suporte e incidentes

## Entrada

O canal `/contact` valida campos, limita abuso e usa Resend quando configurado.
Nunca solicitar senha, token, chave privada ou arquivo de evidência por e-mail.

## Severidade proposta

| Nível | Exemplo | Ação |
| --- | --- | --- |
| CRITICAL | cross-tenant, segredo ou perda irrecuperável | interromper piloto/venda, conter e preservar evidência |
| HIGH | login, pagamento ou estado canônico indisponível | acionar owner e preparar rollback |
| MEDIUM | integração externa degradada com estado íntegro | desativar integração e comunicar workaround |
| LOW | dúvida, texto ou melhoria sem risco operacional | registrar e priorizar |

Prazos comerciais de resposta ainda não estão aprovados; não publicar SLA antes
da decisão de suporte e capacidade.

## Triagem

1. coletar horário, organização afetada, rota e correlation/run ID;
2. confirmar que o relato não contém segredo ou conteúdo desnecessário;
3. consultar logs Sentry/Logtail/Vercel e ledger sem imprimir payload pessoal;
4. classificar impacto e tenant; testar negativa em outra organização;
5. conter, corrigir, validar e registrar recovery;
6. fechar somente com evidência e comunicação à pessoa afetada.
