# Proveniência e política de ingestão

## Fonte recebida

- Nome original: `HAND-OFF..zip`
- SHA-256: `0455fc66bbde6091cf26d98a4815ac48e4c72146de5e38b91f1760f5f63febe7`
- Data de análise: 24/08/2026
- Conteúdo observado: documentação, contratos, amostras, scripts, artefatos de
  design e traces de uma sessão de validação.

## Decisão de ingestão

O ZIP bruto não é versionado porque este repositório é público e o pacote
contém traces de sessão, referências operacionais e material que exige revisão
de privacidade. Publicar o arquivo integral contrariaria a minimização de dados
definida para o Agent-007.

Foram incorporados somente requisitos, achados e contratos sanitizados. O hash
acima permite confirmar a fonte sem expor o conteúdo bruto.

## Política para datasets e traces

O repositório pode armazenar apenas dados sintéticos ou sanitizados com:

- entrada observável necessária ao teste;
- decisão e ação observáveis;
- resultado, erro e evidência vinculados por identificador;
- remoção de credenciais, PII, IDs externos sensíveis e caminhos locais;
- ausência de raciocínio privado ou transcrições internas do modelo;
- retenção, acesso e finalidade declarados.

Qualquer dataset real precisa de revisão humana antes do commit.
