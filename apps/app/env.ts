import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as collaboration } from "@repo/collaboration/keys";
import { keys as email } from "@repo/email/keys";
import { keys as flags } from "@repo/feature-flags/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as notifications } from "@repo/notifications/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as security } from "@repo/security/keys";
import { keys as webhooks } from "@repo/webhooks/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  extends: [
    auth(),
    analytics(),
    collaboration(),
    core(),
    email(),
    flags(),
    notifications(),
    observability(),
    security(),
    webhooks(),
  ],
  server: {
    AWS_REGION: z.string().min(1).optional(),
    AWS_ROLE_ARN: z.string().startsWith("arn:aws:iam::").optional(),
    AURORA_DATABASE: z
      .string()
      .regex(/^[a-z][a-z0-9_]{1,62}$/)
      .optional(),
    AURORA_RESOURCE_ARN: z.string().startsWith("arn:aws:rds:").optional(),
    AURORA_RUNTIME_SECRET_ARN: z
      .string()
      .startsWith("arn:aws:secretsmanager:")
      .optional(),
    EVIDENCE_BUCKET: z
      .string()
      .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/)
      .optional(),
  },
  client: {},
  runtimeEnv: {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ROLE_ARN: process.env.AWS_ROLE_ARN,
    AURORA_DATABASE: process.env.AURORA_DATABASE,
    AURORA_RESOURCE_ARN: process.env.AURORA_RESOURCE_ARN,
    AURORA_RUNTIME_SECRET_ARN: process.env.AURORA_RUNTIME_SECRET_ARN,
    EVIDENCE_BUCKET: process.env.EVIDENCE_BUCKET,
  },
});
