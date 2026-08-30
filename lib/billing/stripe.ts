import Stripe from "stripe";
import type { Plan } from "@/types/domain";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function priceIdForPlan(plan: Exclude<Plan, "free">): string | null {
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO ?? null;
  return process.env.STRIPE_PRICE_TEAM ?? null;
}

export type BillingAdapter = {
  mode: "stripe" | "local";
  createCheckoutUrl: (input: {
    organizationId: string;
    plan: Exclude<Plan, "free">;
    customerEmail: string;
  }) => Promise<string>;
  createPortalUrl: (organizationId: string) => Promise<string>;
};

export function billingAdapter(): BillingAdapter {
  const stripe = getStripe();
  if (!stripe) {
    return {
      mode: "local",
      async createCheckoutUrl({ plan }) {
        return `/settings/billing?simulate=${plan}`;
      },
      async createPortalUrl() {
        return "/settings/billing?simulate=portal";
      },
    };
  }

  return {
    mode: "stripe",
    async createCheckoutUrl({ organizationId, plan, customerEmail }) {
      const price = priceIdForPlan(plan);
      if (!price) throw new Error(`Missing Stripe price for ${plan}`);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: customerEmail,
        line_items: [{ price, quantity: 1 }],
        success_url: `${appUrl}/settings/billing?checkout=success`,
        cancel_url: `${appUrl}/settings/billing?checkout=cancel`,
        metadata: { organizationId, plan },
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return session.url;
    },
    async createPortalUrl() {
      throw new Error("Stripe customer portal requires a stored customer id");
    },
  };
}
