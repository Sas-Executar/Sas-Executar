export interface ExecutarClientStorageScope {
  readonly organizationId: string;
  readonly userId: string;
}

interface ExecutarStorageEnvelope {
  readonly organizationId: string;
  readonly payload: string;
  readonly schemaVersion: "1.0.0";
  readonly userId: string;
}

export interface ExecutarStorageScopeInstallation {
  readonly dispose: () => void;
  readonly purge: () => void;
}

const EXECUTAR_SCOPE_PREFIX = "executar:scope:";
const STORAGE_ENVELOPE_VERSION = "1.0.0" as const;

function requireScope(scope: ExecutarClientStorageScope): void {
  if (!(scope.organizationId.trim() && scope.userId.trim())) {
    throw new Error("Organização e usuário são obrigatórios para persistência local.");
  }
}

function legacyOrganizationPrefix(scope: ExecutarClientStorageScope): string {
  return `executar:${scope.organizationId}:`;
}

export function executarScopedStoragePrefix(
  scope: ExecutarClientStorageScope
): string {
  requireScope(scope);
  return `${EXECUTAR_SCOPE_PREFIX}${scope.organizationId}:${scope.userId}:`;
}

export function executarScopedStorageKey(
  legacyKey: string,
  scope: ExecutarClientStorageScope
): string | null {
  requireScope(scope);
  const prefix = legacyOrganizationPrefix(scope);

  if (!legacyKey.startsWith(prefix)) {
    return null;
  }

  return `${executarScopedStoragePrefix(scope)}${legacyKey.slice(prefix.length)}`;
}

export function encodeExecutarStorageEnvelope(
  payload: string,
  scope: ExecutarClientStorageScope
): string {
  requireScope(scope);

  const envelope: ExecutarStorageEnvelope = {
    schemaVersion: STORAGE_ENVELOPE_VERSION,
    organizationId: scope.organizationId,
    userId: scope.userId,
    payload,
  };

  return JSON.stringify(envelope);
}

export function decodeExecutarStorageEnvelope(
  raw: string | null,
  scope: ExecutarClientStorageScope
): string | null {
  if (!raw) {
    return null;
  }

  requireScope(scope);

  try {
    const candidate: unknown = JSON.parse(raw);

    if (!(candidate && typeof candidate === "object")) {
      return null;
    }

    const envelope = candidate as Partial<ExecutarStorageEnvelope>;

    if (
      envelope.schemaVersion !== STORAGE_ENVELOPE_VERSION ||
      envelope.organizationId !== scope.organizationId ||
      envelope.userId !== scope.userId ||
      typeof envelope.payload !== "string"
    ) {
      return null;
    }

    return envelope.payload;
  } catch {
    return null;
  }
}

function matchingKeys(storage: Storage, prefix: string): string[] {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }

  return keys;
}

export function purgeLegacyExecutarOrganizationStorage(
  storage: Storage,
  scope: ExecutarClientStorageScope
): void {
  requireScope(scope);

  for (const key of matchingKeys(storage, legacyOrganizationPrefix(scope))) {
    storage.removeItem(key);
  }
}

export function purgeExecutarStorageScope(
  storage: Storage,
  scope: ExecutarClientStorageScope
): void {
  for (const key of matchingKeys(storage, executarScopedStoragePrefix(scope))) {
    storage.removeItem(key);
  }
}

export function installExecutarStorageScope(
  scope: ExecutarClientStorageScope,
  targetWindow: Window = window
): ExecutarStorageScopeInstallation {
  requireScope(scope);

  const storage = targetWindow.localStorage;
  const storagePrototype = Object.getPrototypeOf(storage) as Storage;
  const originalGetItem = storagePrototype.getItem;
  const originalSetItem = storagePrototype.setItem;
  const originalRemoveItem = storagePrototype.removeItem;
  const scopedPrefix = executarScopedStoragePrefix(scope);
  const legacyPrefix = legacyOrganizationPrefix(scope);

  // A chave antiga não identifica o usuário. Não é seguro migrá-la porque não
  // existe evidência local de quem era o proprietário do snapshot.
  purgeLegacyExecutarOrganizationStorage(storage, scope);

  Object.defineProperty(storagePrototype, "getItem", {
    configurable: true,
    writable: true,
    value(this: Storage, key: string): string | null {
      if (this !== storage) {
        return originalGetItem.call(this, key);
      }

      const scopedKey = executarScopedStorageKey(key, scope);

      if (!scopedKey) {
        return originalGetItem.call(this, key);
      }

      const raw = originalGetItem.call(storage, scopedKey);
      const payload = decodeExecutarStorageEnvelope(raw, scope);

      if (raw && payload === null) {
        originalRemoveItem.call(storage, scopedKey);
      }

      return payload;
    },
  });

  Object.defineProperty(storagePrototype, "setItem", {
    configurable: true,
    writable: true,
    value(this: Storage, key: string, value: string): void {
      if (this !== storage) {
        originalSetItem.call(this, key, value);
        return;
      }

      const scopedKey = executarScopedStorageKey(key, scope);

      if (!scopedKey) {
        originalSetItem.call(this, key, value);
        return;
      }

      originalSetItem.call(
        storage,
        scopedKey,
        encodeExecutarStorageEnvelope(value, scope)
      );
    },
  });

  Object.defineProperty(storagePrototype, "removeItem", {
    configurable: true,
    writable: true,
    value(this: Storage, key: string): void {
      if (this !== storage) {
        originalRemoveItem.call(this, key);
        return;
      }

      const scopedKey = executarScopedStorageKey(key, scope);
      originalRemoveItem.call(storage, scopedKey ?? key);
    },
  });

  function bridgeStorageEvent(event: StorageEvent): void {
    if (
      event.storageArea !== storage ||
      !event.key?.startsWith(scopedPrefix)
    ) {
      return;
    }

    const suffix = event.key.slice(scopedPrefix.length);
    const legacyKey = `${legacyPrefix}${suffix}`;
    const newValue = decodeExecutarStorageEnvelope(event.newValue, scope);
    const oldValue = decodeExecutarStorageEnvelope(event.oldValue, scope);

    if (event.newValue && newValue === null) {
      originalRemoveItem.call(storage, event.key);
      return;
    }

    targetWindow.dispatchEvent(
      new targetWindow.StorageEvent("storage", {
        key: legacyKey,
        newValue,
        oldValue,
        storageArea: storage,
        url: event.url,
      })
    );
  }

  targetWindow.addEventListener("storage", bridgeStorageEvent, true);

  return {
    purge: () => purgeExecutarStorageScope(storage, scope),
    dispose: () => {
      targetWindow.removeEventListener("storage", bridgeStorageEvent, true);

      Object.defineProperty(storagePrototype, "getItem", {
        configurable: true,
        writable: true,
        value: originalGetItem,
      });
      Object.defineProperty(storagePrototype, "setItem", {
        configurable: true,
        writable: true,
        value: originalSetItem,
      });
      Object.defineProperty(storagePrototype, "removeItem", {
        configurable: true,
        writable: true,
        value: originalRemoveItem,
      });
    },
  };
}
