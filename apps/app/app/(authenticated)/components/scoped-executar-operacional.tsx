"use client";

import { useUser } from "@repo/auth/client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type ExecutarStorageScopeInstallation,
  installExecutarStorageScope,
} from "@/lib/executar/client-storage-scope";
import { ExecutarOperacional } from "./executar-operacional";

interface ScopedExecutarOperacionalProperties {
  readonly collaborationAvailable: boolean;
  readonly externalNotificationsAvailable: boolean;
  readonly organizationId: string;
  readonly remotePersistenceAvailable: boolean;
  readonly userId: string;
}

export function ScopedExecutarOperacional(
  properties: ScopedExecutarOperacionalProperties
) {
  const { isLoaded, isSignedIn } = useUser();
  const scopeKey = `${properties.organizationId}:${properties.userId}`;
  const scope = useMemo(
    () => ({
      organizationId: properties.organizationId,
      userId: properties.userId,
    }),
    [properties.organizationId, properties.userId]
  );
  const installation = useRef<ExecutarStorageScopeInstallation | null>(null);
  const [installedScopeKey, setInstalledScopeKey] = useState<string | null>(
    null
  );

  useLayoutEffect(() => {
    setInstalledScopeKey(null);
    const current = installExecutarStorageScope(scope);

    installation.current = current;
    setInstalledScopeKey(scopeKey);

    return () => {
      current.dispose();
      installation.current = null;
    };
  }, [scope, scopeKey]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      installation.current?.purge();
    }
  }, [isLoaded, isSignedIn]);

  if (installedScopeKey !== scopeKey) {
    return null;
  }

  return <ExecutarOperacional {...properties} />;
}
