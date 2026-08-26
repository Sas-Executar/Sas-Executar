# EXECUTAR Mobile

Aplicativo Expo separado de `apps/app`. Ele compartilha apenas contratos nativos
seguros por `@repo/executar-contracts`; o design system web não é importado.

## Desenvolvimento local

1. Copie `.env.example` para `.env.local`.
2. Informe a chave publicável do Clerk e uma URL do SaaS alcançável pelo aparelho.
3. Na instância Clerk, habilite a Native API antes de validar autenticação real.
4. Execute `bun install` na raiz e `bun --filter mobile dev`.

O endpoint `GET /api/executar/mobile` deriva uma projeção somente leitura do
estado canônico autenticado. Conclusão, evidência e outras escritas permanecem
bloqueadas até o Gate Mobile comprovar sessão nativa, isolamento entre duas
organizações e sincronização remota.

Tamagui compõe a superfície compartilhável. Arquivos `.ios.tsx` usam
`@expo/ui/swift-ui` para controles realmente nativos e os arquivos `.tsx`
equivalentes mantêm o fallback Android.
