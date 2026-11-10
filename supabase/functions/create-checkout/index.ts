import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_RANK: Record<string, number> = {
  adaptive_ai_copper_yearly: 1,
  adaptive_ai_diamond_yearly: 2,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const priceId = body?.priceId as string | undefined;
    const userId = body?.userId as string | undefined;
    const customerEmail = body?.customerEmail as string | undefined;
    const returnUrl = body?.returnUrl as string | undefined;
    const environment = (body?.environment as StripeEnv | undefined) ?? "sandbox";

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return json({ error: "Invalid priceId" }, 400);
    }
    if (!returnUrl) return json({ error: "Missing returnUrl" }, 400);
    if (environment !== "sandbox" && environment !== "live") {
      return json({ error: "Invalid environment" }, 400);
    }

    const stripe = createStripeClient(environment);
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) return json({ error: "Price not found" }, 404);
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    // Block duplicate purchases & handle upgrades by inspecting the user's
    // existing active subscription (if any).
    let existingActiveSubId: string | null = null;
    if (userId) {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: existing } = await sb
        .from("subscriptions")
        .select("stripe_subscription_id, price_id, status, cancel_at_period_end")
        .eq("user_id", userId)
        .eq("environment", environment)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && !existing.cancel_at_period_end) {
        const existingRank = TIER_RANK[existing.price_id as string] ?? 0;
        const newRank = TIER_RANK[priceId] ?? 0;
        if (existing.price_id === priceId) {
          return json({ error: "You already have an active subscription on this tier." }, 409);
        }
        if (newRank < existingRank) {
          return json(
            { error: "You already have a higher-tier subscription. Use the billing portal to switch." },
            409,
          );
        }
        // Upgrade path: remember the old subscription so we can cancel it
        // at period end after the new one is created.
        existingActiveSubId = existing.stripe_subscription_id as string;
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      managed_payments: { enabled: true },
      ...(customerEmail && { customer_email: customerEmail }),
      ...(userId && {
        metadata: {
          userId,
          managed_payments: "true",
          ...(existingActiveSubId && { upgrade_from_subscription: existingActiveSubId }),
        },
        ...(isRecurring && {
          subscription_data: {
            metadata: {
              userId,
              ...(existingActiveSubId && { upgrade_from_subscription: existingActiveSubId }),
            },
          },
        }),
      }),
    } as any);

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("create-checkout error", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
