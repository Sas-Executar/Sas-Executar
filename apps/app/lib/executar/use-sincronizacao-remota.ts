"use client";

/**
 * Sincronização remota do estado operacional principal (dashboard) —
 * extraído de executar-operacional.tsx na correção estrutural da
 * auditoria de 02/09/2026. Reúne os 6 efeitos que antes viviam soltos no
 * componente: hidratação inicial (localStorage + fetch remoto),
 * reconciliação, gravação local debatida, POST debatido pro servidor,
 * poll periódico (pausado com a aba em segundo plano) e o listener de
 * `storage` pra sincronizar entre abas do mesmo aparelho.
 *
 * Puro reagrupamento — nenhum comportamento muda aqui: cada efeito é
 * copiado tal como estava, só o "onde vive" mudou. Diferente de
 * `use-estado-local.ts` (espelho somente-leitura pro Scanner/Mapa-OS),
 * este hook é a fonte real de leitura E escrita usada pelo dashboard.
 */

import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { receberAtualizacaoCompartilhada } from "./distribution.ts";
import type { AtorOperacional, EstadoOperacional } from "./domain.ts";
import { chaveOrganizacao, novoEstado, restaurarEstado } from "./domain.ts";
import { ENTREGAS_SPRINT } from "./seed.ts";

interface UseSincronizacaoRemotaParameters {
  readonly actor: AtorOperacional;
  /** Chamado sempre que a hidratação inicial (re)começa — ex.: pra limpar
   * um estado auxiliar do chamador que só faz sentido por organização/
   * usuário, como o mapa de aprovações do Copiloto pendentes no servidor. */
  readonly onReiniciar?: () => void;
  readonly organizationId: string;
  readonly remotePersistenceAvailable: boolean;
  readonly userId: string;
}

interface SincronizacaoRemota {
  readonly loaded: boolean;
  readonly remoteReady: boolean;
  readonly remoteRevisionRef: MutableRefObject<number>;
  readonly setState: Dispatch<SetStateAction<EstadoOperacional>>;
  readonly setSyncNotice: Dispatch<SetStateAction<string>>;
  readonly state: EstadoOperacional;
  readonly syncNotice: string;
}

export function useSincronizacaoRemota({
  actor,
  onReiniciar,
  organizationId,
  remotePersistenceAvailable,
  userId,
}: UseSincronizacaoRemotaParameters): SincronizacaoRemota {
  const [state, setState] = useState(() =>
    novoEstado(organizationId, ENTREGAS_SPRINT)
  );
  const [loaded, setLoaded] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const latestState = useRef(state);
  const remoteRevision = useRef(-1);

  useEffect(() => {
    latestState.current = state;
  }, [state]);

  // Hidratação inicial: lê o localStorage, aplica, e — se a persistência
  // remota estiver disponível — busca o estado do servidor e reconcilia.
  // biome-ignore lint/correctness/useExhaustiveDependencies: onReiniciar é intencionalmente excluído — é uma closure nova a cada render do chamador; incluí-la faria este efeito (re-hidratação completa) rodar a cada render em vez de só quando organizationId/userId/remotePersistenceAvailable mudam.
  useEffect(() => {
    let active = true;
    const stored = window.localStorage.getItem(
      chaveOrganizacao(organizationId)
    );
    const local = restaurarEstado(stored, organizationId, ENTREGAS_SPRINT);

    remoteRevision.current = -1;
    onReiniciar?.();
    setRemoteReady(false);
    setState(local);
    setLoaded(true);

    if (!remotePersistenceAvailable) {
      return () => {
        active = false;
      };
    }

    fetch("/api/executar/state", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            "Persistência remota indisponível; o progresso continua salvo neste aparelho."
          );
        }

        const body = (await response.json()) as {
          state: EstadoOperacional | null;
        };

        if (!(active && body.state)) {
          if (active) {
            setRemoteReady(true);
          }

          return;
        }

        const incoming = restaurarEstado(
          JSON.stringify(body.state),
          organizationId,
          ENTREGAS_SPRINT
        );
        const result = receberAtualizacaoCompartilhada(local, incoming, {
          organizationId,
          userId,
          displayName: userId,
        });

        remoteRevision.current = incoming.revision;

        if (result.status === "aplicada") {
          setState(result.state);
        } else if (result.status === "conflito") {
          setSyncNotice(
            "Este aparelho possui alterações diferentes; revise antes de sincronizar."
          );
        }

        setRemoteReady(true);
      })
      .catch(() => {
        if (active) {
          setSyncNotice(
            "Persistência remota indisponível; o progresso continua salvo neste aparelho."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [organizationId, remotePersistenceAvailable, userId]);

  // Gravação local debatida — mesma janela de 250ms do POST logo abaixo.
  // Sem isso, cada mudança de estado (inclusive cada tecla digitada)
  // disparava uma gravação síncrona de JSON.stringify(state) inteiro no
  // localStorage, bloqueando a thread principal (achado da auditoria de
  // 02/09/2026).
  useEffect(() => {
    if (!(loaded && state.organizationId === organizationId)) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        chaveOrganizacao(organizationId),
        JSON.stringify(state)
      );
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loaded, organizationId, state]);

  // POST debatido pro servidor.
  useEffect(() => {
    if (
      !(
        remotePersistenceAvailable &&
        loaded &&
        remoteReady &&
        state.organizationId === organizationId
      ) ||
      remoteRevision.current === state.revision
    ) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      fetch("/api/executar/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          expectedRevision: remoteRevision.current,
        }),
      })
        .then(async (response) => {
          const body = (await response.json()) as {
            error?: string;
            revision?: number;
          };

          if (!response.ok) {
            throw new Error(
              body.error ??
                "Não foi possível sincronizar o progresso com o servidor."
            );
          }

          if (active && body.revision === state.revision) {
            remoteRevision.current = body.revision;
            setSyncNotice("");
          }
        })
        .catch((problem: unknown) => {
          if (active) {
            setSyncNotice(
              problem instanceof Error
                ? problem.message
                : "Não foi possível sincronizar o progresso com o servidor."
            );
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loaded, organizationId, remotePersistenceAvailable, remoteReady, state]);

  // Poll periódico — pausa com a aba em segundo plano — sem isso rodava
  // pra sempre a cada 15s mesmo minimizado, gastando rede e CPU sem
  // ninguém olhando (achado da auditoria de 02/09/2026, relevante
  // sobretudo no celular). Ao voltar o foco, poll imediato em vez de
  // esperar o próximo tick de 15s.
  useEffect(() => {
    if (!(remotePersistenceAvailable && remoteReady)) {
      return;
    }

    function pollRemoteState() {
      fetch("/api/executar/state", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }

          const body = (await response.json()) as {
            state: EstadoOperacional | null;
          };

          if (!body.state || body.state.revision <= remoteRevision.current) {
            return;
          }

          const incoming = restaurarEstado(
            JSON.stringify(body.state),
            organizationId,
            ENTREGAS_SPRINT
          );
          const result = receberAtualizacaoCompartilhada(
            latestState.current,
            incoming,
            actor
          );

          if (result.status === "aplicada") {
            remoteRevision.current = incoming.revision;
            setState(result.state);
            setSyncNotice("");
          } else if (result.status === "conflito") {
            setSyncNotice(
              "Atualização simultânea detectada; o estado local foi preservado."
            );
          }
        })
        .catch(() => {
          // O estado local permanece disponível durante falhas de rede.
        });
    }

    let interval: number | undefined;

    function startInterval() {
      if (interval === undefined) {
        interval = window.setInterval(pollRemoteState, 15_000);
      }
    }

    function stopInterval() {
      if (interval !== undefined) {
        window.clearInterval(interval);
        interval = undefined;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        pollRemoteState();
        startInterval();
      } else {
        stopInterval();
      }
    }

    if (document.visibilityState === "visible") {
      startInterval();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopInterval();
    };
  }, [actor, organizationId, remotePersistenceAvailable, remoteReady]);

  // Sincronização entre abas do mesmo aparelho via o evento `storage`.
  useEffect(() => {
    const key = chaveOrganizacao(organizationId);

    function receive(event: StorageEvent) {
      if (event.key !== key || event.newValue === null) {
        return;
      }

      try {
        const incoming = restaurarEstado(
          event.newValue,
          organizationId,
          ENTREGAS_SPRINT
        );
        const result = receberAtualizacaoCompartilhada(
          latestState.current,
          incoming,
          actor
        );

        if (result.status === "conflito") {
          setSyncNotice(
            "Atualização simultânea detectada; o estado local foi preservado."
          );
          return;
        }

        if (result.status === "aplicada") {
          setState(result.state);
          setSyncNotice("");
        }
      } catch (error) {
        setSyncNotice(
          error instanceof Error
            ? error.message
            : "Não foi possível receber a atualização compartilhada."
        );
      }
    }

    window.addEventListener("storage", receive);

    return () => window.removeEventListener("storage", receive);
  }, [actor, organizationId]);

  return {
    loaded,
    remoteReady,
    remoteRevisionRef: remoteRevision,
    setState,
    setSyncNotice,
    state,
    syncNotice,
  };
}
