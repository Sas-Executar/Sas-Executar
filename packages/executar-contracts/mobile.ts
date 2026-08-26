import { z } from "zod";

export const entregaMobileSchema = z.object({
  date: z.string().regex(/^\d{2}\/\d{2}$/),
  deps: z.array(z.string()).readonly(),
  dod: z.string().optional(),
  front: z.string().min(1),
  id: z.string().min(1),
  mins: z.number().int().positive(),
  stage: z.number().int().min(1).max(4),
  title: z.string().min(1),
}).readonly();

export const diaOperacionalMobileSchema = z.object({
  capacityMinutes: z.number().int().positive(),
  completedCount: z.number().int().nonnegative(),
  date: z.string().regex(/^\d{2}\/\d{2}$/),
  overloaded: z.boolean(),
  plannedMinutes: z.number().int().nonnegative(),
  tasks: z.array(entregaMobileSchema).readonly(),
}).readonly();

export const evidenciaMobileSchema = z.object({
  createdAt: z.string().min(1),
  file: z
    .object({
      name: z.string().min(1),
      size: z.number().int().nonnegative(),
      type: z.string().min(1),
    }).readonly()
    .optional(),
  note: z.string(),
  taskId: z.string().min(1),
  url: z.string(),
  verified: z.boolean(),
}).readonly();

export const projecaoEstadoMobileSchema = z.object({
  calendar: z.array(diaOperacionalMobileSchema).readonly(),
  evidence: z.array(evidenciaMobileSchema).readonly(),
  focus: entregaMobileSchema.nullable(),
  organizationId: z.string().min(1),
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  ready: z.array(entregaMobileSchema).readonly(),
  revision: z.number().int().nonnegative(),
}).readonly();

export const respostaEstadoMobileSchema = z.object({
  projection: projecaoEstadoMobileSchema,
}).readonly();

export type EntregaMobile = z.infer<typeof entregaMobileSchema>;
export type DiaOperacionalMobile = z.infer<
  typeof diaOperacionalMobileSchema
>;
export type EvidenciaMobile = z.infer<typeof evidenciaMobileSchema>;
export type ProjecaoEstadoMobile = z.infer<
  typeof projecaoEstadoMobileSchema
>;
export type RespostaEstadoMobile = z.infer<
  typeof respostaEstadoMobileSchema
>;
