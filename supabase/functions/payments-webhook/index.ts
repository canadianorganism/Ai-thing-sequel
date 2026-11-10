import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

// Map our human-readable price IDs (lookup keys) to entitlement tiers.
const PRICE_TO_TIER: Record<string, "copper" | "diamond"> = {
  adaptive_ai_copper_yearly: "copper",
  adaptive_ai_diamond_yearly: "diamond",
};

function tierForPrice(priceId: string | undefined): "copper" | "diamond" | null {
  if (!priceId) return null;
  return PRICE_TO_TIER[priceId] ?? null;
}

async function grantEntitlement(userId: string, priceId: string | undefined) {
  const tier = tierForPrice(priceId);
  if (!tier) {
    console.warn("Unknown priceId for entitlement, skipping grant:", priceId);
    return;
  }
  const sb = getSupabase();
  const { data: existing } = await sb
    .from("ai_entitlements")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();
  // Don't downgrade diamond -> copper.
  const finalTier =
    existing?.tier === "diamond" && tier === "copper" ? "diamond" : tier;
  const { error } = await sb
    .from("ai_entitlements")
    .upsert({ user_id: userId, tier: finalTier }, { onConflict: "user_id" });
  if (error) console.error("entitlement upsert failed", error);
}

async function revokeEntitlement(userId: string) {
  const sb = getSupabase();
  await sb.from("ai_entitlements").delete().eq("user_id", userId);
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.metadata?.lovable_external_id || item?.price?.lookup_key || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due"
  ) {
    await grantEntitlement(userId, priceId);

    // Upgrade flow: if this subscription replaces an older one, cancel the
    // old one at period end so the user isn't double-billed.
    const upgradeFrom = subscription.metadata?.upgrade_from_subscription;
    if (upgradeFrom && upgradeFrom !== subscription.id) {
      try {
        const stripe = createStripeClient(env);
        await stripe.subscriptions.update(upgradeFrom, { cancel_at_period_end: true });
        console.log("Scheduled cancel for upgraded-from subscription:", upgradeFrom);
      } catch (e) {
        console.error("Failed to cancel old subscription on upgrade:", e);
      }
    }
  } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
    // Only revoke if no other active subscription exists for this user.
    const sb = getSupabase();
    const { data: others } = await sb
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", env)
      .in("status", ["active", "trialing", "past_due"])
      .neq("stripe_subscription_id", subscription.id)
      .limit(1);
    if (!others || others.length === 0) await revokeEntitlement(userId);
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  if (userId) {
    const sb = getSupabase();
    const { data: others } = await sb
      .from("subscriptions")
      .select("stripe_subscription_id, price_id")
      .eq("user_id", userId)
      .eq("environment", env)
      .in("status", ["active", "trialing", "past_due"])
      .neq("stripe_subscription_id", subscription.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (others?.price_id) {
      await grantEntitlement(userId, others.price_id as string);
    } else {
      await revokeEntitlement(userId);
    }
  }
}

async function handleEvent(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleEvent(req, rawEnv as StripeEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
