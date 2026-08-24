import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const STRIPE_SECRET_PATTERN = /^(?:rk|sk)_/;

export const keys = () =>
  createEnv({
    emptyStringAsUndefined: true,
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      STRIPE_SECRET_KEY: z.string().regex(STRIPE_SECRET_PATTERN).optional(),
      STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
    },
    runtimeEnv: {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    },
  });
