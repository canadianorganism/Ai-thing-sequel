import { supabase } from '@/integrations/supabase/client';
import { getStripeEnvironment } from '@/lib/stripe';

export type AITier = 'copper' | 'diamond';

export interface SubscriptionInfo {
  tier: AITier | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}

const PRICE_TO_TIER: Record<string, AITier> = {
  adaptive_ai_copper_yearly: 'copper',
  adaptive_ai_diamond_yearly: 'diamond',
};

/**
 * Server-backed entitlement. The source of truth lives in the
 * `ai_entitlements` table; clients can only read their own row, and only
 * edge functions (via Stripe webhooks) can write it.
 */
export async function fetchEntitlement(): Promise<AITier | null> {
  const { data, error } = await supabase
    .from('ai_entitlements')
    .select('tier')
    .maybeSingle();
  if (error || !data) return null;
  return data.tier as AITier;
}

export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { tier: null, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, stripeSubscriptionId: null };
  }
  const env = getStripeEnvironment();
  const [entRes, subRes] = await Promise.all([
    supabase.from('ai_entitlements').select('tier').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end, stripe_subscription_id, price_id')
      .eq('user_id', user.id)
      .eq('environment', env)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    tier: (entRes.data?.tier as AITier | undefined) ?? null,
    status: subRes.data?.status ?? null,
    currentPeriodEnd: subRes.data?.current_period_end ?? null,
    cancelAtPeriodEnd: subRes.data?.cancel_at_period_end ?? false,
    stripeSubscriptionId: subRes.data?.stripe_subscription_id ?? null,
  };
}

export function tierForPriceId(priceId: string | null | undefined): AITier | null {
  if (!priceId) return null;
  return PRICE_TO_TIER[priceId] ?? null;
}
