export const ACTIVE_BILLING_STATUSES = new Set([
  "active",
  "complete",
  "paid",
  "trialing",
]);

export interface OrganizationBillingInput {
  readonly currentPeriodEnd?: number | null;
  readonly customerId: string;
  readonly eventCreated: number;
  readonly eventId: string;
  readonly organizationCandidates: readonly unknown[];
  readonly priceId?: string | null;
  readonly status: string;
  readonly subscriptionId?: string | null;
}

export interface OrganizationBillingEntitlement {
  readonly active: boolean;
  readonly currentPeriodEnd: string | null;
  readonly customerId: string;
  readonly eventCreated: number;
  readonly eventId: string;
  readonly organizationId: string;
  readonly priceId: string | null;
  readonly status: string;
  readonly subscriptionId: string | null;
}

const ORGANIZATION_ID = /^org_[A-Za-z0-9]+$/;
const BILLING_STATUS = /^[a-z][a-z0-9_]{1,31}$/;
const STRIPE_ID = /^(?:cus|evt|price|sub|cs)_[A-Za-z0-9_]+$/;

function validCandidate(candidate: unknown): string | null {
  return typeof candidate === "string" && ORGANIZATION_ID.test(candidate)
    ? candidate
    : null;
}

export function resolveBillingOrganization(
  candidates: readonly unknown[]
): string {
  const organizationIds = new Set(
    candidates.map(validCandidate).filter((value): value is string => !!value)
  );

  if (organizationIds.size !== 1) {
    throw new Error(
      organizationIds.size > 1
        ? "O evento Stripe referencia organizações divergentes."
        : "O evento Stripe não referencia uma organização Clerk válida."
    );
  }

  return [...organizationIds][0];
}

function optionalStripeId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!STRIPE_ID.test(value)) {
    throw new Error("O evento Stripe contém um identificador inválido.");
  }

  return value;
}

export function deriveOrganizationEntitlement({
  customerId,
  currentPeriodEnd,
  eventCreated,
  eventId,
  organizationCandidates,
  priceId,
  status,
  subscriptionId,
}: OrganizationBillingInput): OrganizationBillingEntitlement {
  if (!(STRIPE_ID.test(customerId) && STRIPE_ID.test(eventId))) {
    throw new Error("O evento Stripe exige customer e event válidos.");
  }

  if (!(Number.isSafeInteger(eventCreated) && eventCreated > 0)) {
    throw new Error("O evento Stripe exige timestamp válido.");
  }

  if (!BILLING_STATUS.test(status)) {
    throw new Error("O status de cobrança é inválido.");
  }

  return {
    active: ACTIVE_BILLING_STATUSES.has(status),
    customerId,
    currentPeriodEnd: currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null,
    eventCreated,
    eventId,
    organizationId: resolveBillingOrganization(organizationCandidates),
    priceId: optionalStripeId(priceId),
    status,
    subscriptionId: optionalStripeId(subscriptionId),
  };
}

export function shouldApplyBillingEvent(
  current: { readonly eventCreated?: unknown; readonly eventId?: unknown },
  incoming: { readonly eventCreated: number; readonly eventId: string }
): boolean {
  if (current.eventId === incoming.eventId) {
    return false;
  }

  return (
    typeof current.eventCreated !== "number" ||
    incoming.eventCreated > current.eventCreated
  );
}
