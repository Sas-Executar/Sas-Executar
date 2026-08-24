// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  decodeExecutarStorageEnvelope,
  encodeExecutarStorageEnvelope,
  executarScopedStorageKey,
  installExecutarStorageScope,
  purgeExecutarStorageScope,
} from "@/lib/executar/client-storage-scope";

const organizationId = "org-executar";
const userA = { organizationId, userId: "user-a" };
const userB = { organizationId, userId: "user-b" };
const stateKey = `executar:${organizationId}:v2`;
const queueKey = `executar:${organizationId}:queue:v1`;

afterEach(() => {
  window.localStorage.clear();
});

describe("Executar local storage scope", () => {
  it("deriva chaves diferentes para usuários da mesma organização", () => {
    expect(executarScopedStorageKey(stateKey, userA)).not.toBe(
      executarScopedStorageKey(stateKey, userB)
    );
    expect(executarScopedStorageKey(queueKey, userA)).not.toBe(
      executarScopedStorageKey(queueKey, userB)
    );
  });

  it("rejeita snapshot cujo envelope pertence a outro usuário", () => {
    const raw = encodeExecutarStorageEnvelope('{"revision":7}', userA);

    expect(decodeExecutarStorageEnvelope(raw, userA)).toBe('{"revision":7}');
    expect(decodeExecutarStorageEnvelope(raw, userB)).toBeNull();
  });

  it("descarta a chave legada global antes de hidratar", () => {
    window.localStorage.setItem(stateKey, '{"organizationId":"org-executar"}');

    const installation = installExecutarStorageScope(userA);

    expect(window.localStorage.getItem(stateKey)).toBeNull();
    installation.dispose();
  });

  it("impede usuário B de ler o snapshot local do usuário A", () => {
    const installationA = installExecutarStorageScope(userA);

    window.localStorage.setItem(stateKey, '{"owner":"A"}');
    expect(window.localStorage.getItem(stateKey)).toBe('{"owner":"A"}');
    installationA.dispose();

    const installationB = installExecutarStorageScope(userB);

    expect(window.localStorage.getItem(stateKey)).toBeNull();
    window.localStorage.setItem(stateKey, '{"owner":"B"}');
    expect(window.localStorage.getItem(stateKey)).toBe('{"owner":"B"}');
    installationB.dispose();

    const installationAAgain = installExecutarStorageScope(userA);

    expect(window.localStorage.getItem(stateKey)).toBe('{"owner":"A"}');
    installationAAgain.dispose();
  });

  it("isola também a fila offline por organização e usuário", () => {
    const installationA = installExecutarStorageScope(userA);

    window.localStorage.setItem(queueKey, '[{"operationId":"a-1"}]');
    expect(window.localStorage.getItem(queueKey)).toContain("a-1");
    installationA.dispose();

    const installationB = installExecutarStorageScope(userB);

    expect(window.localStorage.getItem(queueKey)).toBeNull();
    installationB.dispose();
  });

  it("remove somente o escopo do usuário no purge de logout", () => {
    const installationA = installExecutarStorageScope(userA);

    window.localStorage.setItem(stateKey, '{"owner":"A"}');
    installationA.dispose();

    const installationB = installExecutarStorageScope(userB);

    window.localStorage.setItem(stateKey, '{"owner":"B"}');
    installationB.dispose();

    purgeExecutarStorageScope(window.localStorage, userA);

    const installationBAgain = installExecutarStorageScope(userB);
    expect(window.localStorage.getItem(stateKey)).toBe('{"owner":"B"}');
    installationBAgain.dispose();

    const installationAAgain = installExecutarStorageScope(userA);
    expect(window.localStorage.getItem(stateKey)).toBeNull();
    installationAAgain.dispose();
  });
});
