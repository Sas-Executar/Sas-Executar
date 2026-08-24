import { analytics } from "@repo/analytics/server";
import { clerkClient } from "@repo/auth/server";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import {
  deriveOrganizationEntitlement,
  type OrganizationBillingEntitlement,
  shouldApplyBillingEvent,
} from "@repo/payments/entitlements";
import type { Stripe } from "@repo/payments";
import { stripe } from "@repo/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/env";

type StripeCustomer = Stripe.Customer | Stripe.DeletedCustomer;

function stripeId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : (value?.id ?? null);
}

async function customerFor(
  value: string | StripeCustomer | null
): Promise<StripeCustomer | null> {
  if (!value) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  return (await stripe?.customers.retrieve(value)) ?? null;
}

function metadataOrganization(customer: StripeCustomer | null): unknown {
  return customer && !("deleted" in customer && customer.deleted)
    ? customer.metadata.clerkOrganizationId
    : undefined;
}

async function persistEntitlement(
  entitlement: OrganizationBillingEntitlement
): Promise<boolean> {
  const clerk = await clerkClient();
  const organization = await clerk.organizations.getOrganization({
    organizationId: entitlement.organizationId,
  });
  const currentBilling = organization.privateMetadata.billing;
  const current =
    currentBilling && typeof currentBilling === "object"
      ? currentBilling
      : {};

  if (!shouldApplyBillingEvent(current, entitlement)) {
    return false;
  }

  await clerk.organizations.updateOrganizationMetadata(
    entitlement.organizationId,
    {
      privateMetadata: {
        billing: entitlement,
      },
    }
  );

  analytics?.capture({
    event: entitlement.active
      ? "Organization Subscription Active"
      : "Organization Subscription Inactive",
    distinctId: entitlement.organizationId,
    properties: {
      priceId: entitlement.priceId,
      status: entitlement.status,
    },
  });

  return true;
}

async function handleCheckout(
  eventId: string,
  eventCreated: number,
  session: Stripe.Checkout.Session
): Promise<void> {
  const customer = await customerFor(session.customer);
  const customerId = stripeId(session.customer);

  if (!customerId) {
    throw new Error("Checkout sem customer Stripe.");
  }

  await persistEntitlement(
    deriveOrganizationEntitlement({
      customerId,
      eventCreated,
      eventId,
      organizationCandidates: [
        session.metadata?.clerkOrganizationId,
        session.client_reference_id,
        metadataOrganization(customer),
      ],
      status: session.payment_status,
      subscriptionId: stripeId(session.subscription),
    })
  );
}

async function handleSubscription(
  eventId: string,
  eventCreated: number,
  subscription: Stripe.Subscription
): Promise<void> {
  const customer = await customerFor(subscription.customer);
  const firstItem = subscription.items.data[0];

  await persistEntitlement(
    deriveOrganizationEntitlement({
      customerId: stripeId(subscription.customer) ?? "",
      currentPeriodEnd: firstItem?.current_period_end,
      eventCreated,
      eventId,
      organizationCandidates: [
        subscription.metadata.clerkOrganizationId,
        metadataOrganization(customer),
      ],
      priceId: firstItem?.price.id,
      status: subscription.status,
      subscriptionId: subscription.id,
    })
  );
}

async function handleScheduleCanceled(
  eventId: string,
  eventCreated: number,
  schedule: Stripe.SubscriptionSchedule
): Promise<void> {
  const customer = await customerFor(schedule.customer);

  await persistEntitlement(
    deriveOrganizationEntitlement({
      customerId: stripeId(schedule.customer) ?? "",
      eventCreated,
      eventId,
      organizationCandidates: [
        schedule.metadata.clerkOrganizationId,
        metadataOrganization(customer),
      ],
      status: "canceled",
      subscriptionId: stripeId(schedule.subscription),
    })
  );
}

export const POST = async (request: Request): Promise<Response> => {
  if (!(stripe && env.STRIPE_WEBHOOK_SECRET)) {
    return NextResponse.json(
      { message: "Stripe webhook não configurado.", ok: false },
      { status: 503 }
    );
  }

  try {
    const body = await request.text();
    const headerPayload = await headers();
    const signature = headerPayload.get("stripe-signature");

    if (!signature) {
      throw new Error("missing stripe-signature header");
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckout(event.id, event.created, event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscription(event.id, event.created, event.data.object);
        break;
      case "subscription_schedule.canceled":
        await handleScheduleCanceled(event.id, event.created, event.data.object);
        break;
      default:
        log.info(`Evento Stripe ignorado: ${event.type}`);
    }

    await analytics?.shutdown();

    return NextResponse.json({ eventId: event.id, ok: true });
  } catch (error) {
    log.error(parseError(error));

    return NextResponse.json(
      { message: "Falha ao processar webhook Stripe.", ok: false },
      { status: 500 }
    );
  }
};
