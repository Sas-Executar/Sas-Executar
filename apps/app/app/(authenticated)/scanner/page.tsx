import { auth } from "@repo/auth/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScannerClient } from "./scanner-client";

export const metadata: Metadata = {
  title: "EXECUTAR · Scanner",
  description: "Aponte a câmera para o Prisma/Tripé e execute a ação na hora.",
};

const ScannerPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return <ScannerClient organizationId={orgId} />;
};

export default ScannerPage;
