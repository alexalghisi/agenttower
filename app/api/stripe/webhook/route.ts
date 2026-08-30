import { eq } from "drizzle-orm";
import { getStripe, stripeConfigured } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return Response.json({ error: { code: "not_configured", message: "Stripe is not configured" } }, { status: 501 });
  }

  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return Response.json({ error: { code: "not_configured", message: "Missing webhook secret" } }, { status: 501 });
  }

  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: { code: "unauthorized", message: "Missing signature" } }, { status: 400 });
  }

  const event = stripe.webhooks.constructEvent(raw, signature, secret);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const organizationId = session.metadata?.organizationId;
    const plan = session.metadata?.plan;
    if (organizationId && (plan === "pro" || plan === "team")) {
      const db = await getDb();
      await db
        .update(subscriptions)
        .set({
          plan,
          status: "active",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.organizationId, organizationId));
    }
  }

  return Response.json({ received: true });
}
