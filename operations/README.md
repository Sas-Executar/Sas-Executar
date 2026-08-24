# Operations

Área pessoal de operações do repositório canônico EXECUTAR.

## Objetivo

Manter recursos operacionais, workflows e plugins auxiliares isolados do código do produto (`apps/`), dos pacotes compartilhados (`packages/`) e da infraestrutura (`infra/`).

## Estrutura

- `vendor/anthropic-knowledge-work-plugins/` — submódulo do repositório oficial `anthropics/knowledge-work-plugins`, contendo a coleção completa de plugins Knowledge Work disponível no upstream.
- `custom/` — espaço para adaptações pessoais sem editar diretamente o conteúdo vendorizado.
- `UPSTREAM.md` — origem, versão fixada e procedimento de atualização.

## Uso

Clone o repositório incluindo submódulos:

```bash
git clone --recurse-submodules https://github.com/Sas-Executar/Sas-Executar.git
```

Em um clone já existente:

```bash
git submodule update --init --recursive
```

Os plugins da Anthropic permanecem sob a licença Apache-2.0 do projeto de origem. Preserve os avisos e a atribuição do upstream.
