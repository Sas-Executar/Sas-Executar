export const REFERENCIA_SUPABASE_LEGADO_AUTORIZADO = "aaaftocmuiztyxdgclqt";

export type OrigemProjetoSupabase =
  | "novo"
  | "existente"
  | "existente_autorizado";

export function projetoSupabaseAutorizado(
  origin: OrigemProjetoSupabase | undefined,
  reference: string | undefined
): boolean {
  return (
    origin === "novo" ||
    (origin === "existente_autorizado" &&
      reference === REFERENCIA_SUPABASE_LEGADO_AUTORIZADO)
  );
}
