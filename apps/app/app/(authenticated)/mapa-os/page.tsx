import { auth } from "@repo/auth/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapaOSClient } from "./mapa-os-client";
import type { FormatoMapaOS } from "./mapa-os-sheet";

export const metadata: Metadata = {
  title: "EXECUTAR · Mapa-OS (Prisma / Tripé)",
  description:
    "Relatório físico imprimível do Mapa-OS: Admin, Ciclo e Notas em A4.",
};

interface MapaOSPageProperties {
  readonly searchParams: Promise<{ readonly format?: string }>;
}

function resolverFormato(value: string | undefined): FormatoMapaOS {
  return value === "tripe" ? "tripe" : "prisma";
}

const MapaOSPage = async ({ searchParams }: MapaOSPageProperties) => {
  const [{ orgId }, params] = await Promise.all([auth(), searchParams]);

  if (!orgId) {
    notFound();
  }

  return (
    <MapaOSClient
      initialFormat={resolverFormato(params.format)}
      organizationId={orgId}
    />
  );
};

export default MapaOSPage;
