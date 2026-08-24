import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveOrganizationEntitlement,
  resolveBillingOrganization,
  shouldApplyBillingEvent,
} from "../../packages/payments/entitlements.ts";

test("cobrança pertence à organização Clerk e não ao usuário", async () => {
  const route = await readFile(
    new URL("../../apps/api/app/webhooks/payments/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(route, /organizations\.updateOrganizationMetadata/);
  assert.match(route, /clerkOrganizationId/);
  assert.doesNotMatch(route, /users\.getUserList/);
  assert.doesNotMatch(route, /stripeCustomerId ===/);
});

test("evento válido deriva entitlement sem escolher tenant implicitamente", () => {
  const entitlement = deriveOrganizationEntitlement({
    customerId: "cus_customer1",
    currentPeriodEnd: 1_800_000_000,
    eventCreated: 1_799_000_000,
    eventId: "evt_event1",
    organizationCandidates: ["org_acme", "org_acme"],
    priceId: "price_pro1",
    status: "active",
    subscriptionId: "sub_subscription1",
  });

  assert.equal(entitlement.organizationId, "org_acme");
  assert.equal(entitlement.active, true);
  assert.equal(entitlement.status, "active");
  assert.match(entitlement.currentPeriodEnd, /^2027-/);
});

test("evento sem organização ou com tenants divergentes é recusado", () => {
  assert.throws(() => resolveBillingOrganization([]), /não referencia/);
  assert.throws(
    () => resolveBillingOrganization(["org_acme", "org_other"]),
    /divergentes/
  );
  assert.throws(
    () => resolveBillingOrganization(["user_123"]),
    /organização Clerk válida/
  );
});

test("cancelamento remove direito e replay não reaplica o evento", () => {
  const entitlement = deriveOrganizationEntitlement({
    customerId: "cus_customer1",
    eventCreated: 1_799_000_001,
    eventId: "evt_event2",
    organizationCandidates: ["org_acme"],
    status: "canceled",
    subscriptionId: "sub_subscription1",
  });

  assert.equal(entitlement.active, false);
  assert.equal(shouldApplyBillingEvent(entitlement, entitlement), false);
  assert.equal(
    shouldApplyBillingEvent(
      { eventCreated: 1_799_000_000, eventId: "evt_event1" },
      entitlement
    ),
    true
  );
  assert.equal(
    shouldApplyBillingEvent(
      { eventCreated: 1_799_000_002, eventId: "evt_event3" },
      entitlement
    ),
    false
  );
});
