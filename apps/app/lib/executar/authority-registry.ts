export type ProvedorExterno = "DRIVE" | "LINEAR";
export type DirecaoBinding = "EXPORT" | "IMPORT" | "PROJECTION";
export type StatusBinding = "ACTIVE" | "DISABLED";

export interface BindingAutoridade {
  readonly cursor?: string;
  readonly direction: DirecaoBinding;
  readonly externalId: string;
  readonly logicalKey: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly provider: ProvedorExterno;
  readonly status: StatusBinding;
}

export function registrarBinding(
  bindings: readonly BindingAutoridade[],
  binding: BindingAutoridade
): readonly BindingAutoridade[] {
  if (!(binding.organizationId.trim() && binding.projectId.trim())) {
    throw new Error("Binding exige organização e projeto.");
  }

  const current = bindings.find(
    (item) =>
      item.organizationId === binding.organizationId &&
      item.projectId === binding.projectId &&
      item.provider === binding.provider &&
      item.logicalKey === binding.logicalKey &&
      item.direction === binding.direction
  );

  if (!current) {
    return [...bindings, binding];
  }

  if (JSON.stringify(current) === JSON.stringify(binding)) {
    return bindings;
  }

  throw new Error("Binding lógico já aponta para outra autoridade externa.");
}

export function preflightBinding(
  bindings: readonly BindingAutoridade[],
  scope: Pick<
    BindingAutoridade,
    "direction" | "logicalKey" | "organizationId" | "projectId" | "provider"
  >
): BindingAutoridade {
  const binding = bindings.find(
    (item) =>
      item.organizationId === scope.organizationId &&
      item.projectId === scope.projectId &&
      item.provider === scope.provider &&
      item.logicalKey === scope.logicalKey &&
      item.direction === scope.direction
  );

  if (!binding || binding.status !== "ACTIVE") {
    throw new Error("Autoridade externa não está vinculada e ativa.");
  }

  return binding;
}
