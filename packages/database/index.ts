import "server-only";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "./generated/client";
import { keys } from "./keys";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

neonConfig.webSocketConstructor = ws;

const connectionString = keys().DATABASE_URL;
export const databaseAvailable = Boolean(connectionString);
const unavailable = new Proxy({} as PrismaClient, {
  get() {
    throw new Error(
      "DATABASE_URL não configurada. A persistência operacional usa Aurora Data API; configure esta URL somente para rotas Prisma legadas."
    );
  },
});
const configured = connectionString
  ? new PrismaClient({
      adapter: new PrismaNeon({ connectionString }),
    })
  : unavailable;

export const database = globalForPrisma.prisma || configured;

if (process.env.NODE_ENV !== "production" && connectionString) {
  globalForPrisma.prisma = database;
}

export * from "./generated/client";
