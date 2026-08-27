"use client";

/**
 * Leitura somente-leitura do `EstadoOperacional` local-first já usado pelo
 * dashboard (`executar-operacional.tsx`). Lê exatamente a mesma chave de
 * `localStorage` (`chaveOrganizacao`) e a mesma semente (`ENTREGAS_SPRINT`)
 * via `restaurarEstado` — não é uma segunda fonte de verdade, é um segundo
 * ponto de leitura da mesma fonte, para superfícies que só precisam exibir o
 * estado (Mapa-OS impresso, Scanner) sem participar do laço de sincronização
 * remota que já vive inteiramente dentro do dashboard.
 *
 * Deliberadamente NÃO reimplementa a reconciliação com o servidor
 * (`receberAtualizacaoCompartilhada`) nem o merge otimista do dashboard — só
 * reflete o último estado salvo neste aparelho, que é suficiente para
 * imprimir/escanear localmente. Fica em sincronia entre abas via o evento
 * `storage` do navegador.
 */

import { useEffect, useState } from "react";
import {
  chaveOrganizacao,
  type EstadoOperacional,
  restaurarEstado,
} from "./domain.ts";
import { ENTREGAS_SPRINT } from "./seed.ts";

export interface EstadoOperacionalLocal {
  /** Persiste um novo estado na mesma chave e reflete no valor retornado. */
  readonly atualizarEstadoLocal: (novoEstado: EstadoOperacional) => void;
  readonly loaded: boolean;
  readonly state: EstadoOperacional;
}

function lerEstadoLocal(organizationId: string): EstadoOperacional {
  const stored =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(chaveOrganizacao(organizationId));

  return restaurarEstado(stored, organizationId, ENTREGAS_SPRINT);
}

/**
 * Grava o estado na mesma chave que o dashboard usa. Uso isolado (fora do
 * hook) para chamadores que só precisam persistir, sem assinar re-renders.
 */
export function salvarEstadoLocal(
  organizationId: string,
  state: EstadoOperacional
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    chaveOrganizacao(organizationId),
    JSON.stringify(state)
  );
}

export function useEstadoOperacionalLocal(
  organizationId: string
): EstadoOperacionalLocal {
  const [state, setState] = useState<EstadoOperacional>(() =>
    lerEstadoLocal(organizationId)
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(lerEstadoLocal(organizationId));
    setLoaded(true);

    function onStorage(event: StorageEvent) {
      if (event.key === chaveOrganizacao(organizationId)) {
        setState(lerEstadoLocal(organizationId));
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [organizationId]);

  function atualizarEstadoLocal(novoEstado: EstadoOperacional) {
    salvarEstadoLocal(organizationId, novoEstado);
    setState(novoEstado);
  }

  return { state, loaded, atualizarEstadoLocal };
}
