# @repo/mcp

Contrato de autoridade para o futuro endpoint MCP Streamable HTTP do EXECUTAR.

- a sessão vem do Clerk e nunca dos argumentos da ferramenta;
- organização, projeto e revisão vêm do estado canônico;
- escrita relevante continua exigindo aprovação humana;
- o transporte real deve validar `Origin`, autenticação e os headers do protocolo;
- este pacote não declara o MCP remoto como ativo antes do teste hospedado.

O catálogo versionado está em `operations/mcp/registry.json`. O Gate 3 continua
`NÃO PASSOU` até um cliente MCP real completar initialize, tools/list e
tools/call no Preview com isolamento entre duas organizações.
