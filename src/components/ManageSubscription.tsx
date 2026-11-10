import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchSubscriptionInfo, type SubscriptionInfo } from '@/lib/entitlements';
import { getStripeEnvironment } from '@/lib/stripe';
import { toast } from 'sonner';

export default function ManageSubscription() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [opening, setOpening] = useState(false);

  const refresh = () => { void fetchSubscriptionInfo().then(setInfo); };

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (!info || !info.tier) return null;

  const renews = info.currentPeriodEnd
    ? new Date(info.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null;

  const accent = info.tier === 'diamond' ? '#a8c8ff' : '#daa06d';

  const openPortal = async () => {
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: window.location.href,
        },
      });
      if (error || !data?.url) throw new Error(error?.message ?? 'Could not open billing portal');
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('Billing portal unavailable', {
        description: e instanceof Error ? e.message : 'Please try again later.',
      });
    } finally {
      setOpening(false);
    }
  };

  let statusLine: string;
  if (info.status === 'past_due') {
    statusLine = 'Payment failed — Stripe is retrying. Update your card in the billing portal to avoid interruption.';
  } else if (info.cancelAtPeriodEnd && renews) {
    statusLine = `Cancels on ${renews}. Access continues until then.`;
  } else if (info.status === 'canceled' && renews) {
    statusLine = `Canceled. Access ends ${renews}.`;
  } else if (renews) {
    statusLine = `Renews automatically on ${renews}.`;
  } else {
    statusLine = `Status: ${info.status ?? 'unknown'}.`;
  }

  return (
    <div
      className="mt-8 mx-auto max-w-2xl text-left p-5 border-2 rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      style={{
        borderColor: accent,
        background: 'linear-gradient(180deg, rgba(20,20,30,0.85), rgba(10,10,18,0.85))',
      }}
    >
      <div className="space-y-1">
        <div className="font-serif text-xs tracking-[0.3em] uppercase" style={{ color: accent }}>
          {info.tier} license · Active
        </div>
        <p className="text-[#8a8a9a] font-serif text-sm leading-relaxed">{statusLine}</p>
      </div>
      <button
        type="button"
        onClick={openPortal}
        disabled={opening}
        className="shrink-0 px-5 py-2 bg-[#1a1a2a] border font-serif tracking-[0.2em] uppercase text-xs hover:bg-[#2a2a3a] transition-all disabled:opacity-60"
        style={{ borderColor: accent, color: '#e8e8f0' }}
      >
        {opening ? 'Opening…' : 'Manage subscription'}
      </button>
    </div>
  );
}
