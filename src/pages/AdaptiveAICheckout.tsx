import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { trackFunnelEvent } from '@/lib/funnel';
import { fetchEntitlement, type AITier } from '@/lib/entitlements';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from '@/components/StripeEmbeddedCheckout';

const PRICE_IDS: Record<AITier, string> = {
  copper: 'adaptive_ai_copper_yearly',
  diamond: 'adaptive_ai_diamond_yearly',
};

const AdaptiveAICheckout = () => {
  const [params] = useSearchParams();
  const rawFormat = params.get('format');
  const formatParam: 'ts' | 'js' | 'exe' = rawFormat === 'js' ? 'js' : rawFormat === 'exe' ? 'exe' : 'ts';
  const format = formatParam.toUpperCase();

  const [owned, setOwned] = useState<AITier | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [selectedTier, setSelectedTier] = useState<AITier | null>(null);

  useEffect(() => {
    void trackFunnelEvent('checkout_view', { format: formatParam });
    void fetchEntitlement().then(setOwned);
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email ?? undefined });
    });
  }, [formatParam]);

  const handleSelect = (tier: AITier) => {
    void trackFunnelEvent('checkout_click', { format: formatParam, metadata: { tier } });
    setSelectedTier(tier);
  };

  const tiers: Array<{
    id: AITier;
    label: string;
    price: string;
    accent: string;
    border: string;
    bg: string;
    features: string[];
  }> = [
    {
      id: 'copper',
      label: 'Copper Tier',
      price: '$20',
      accent: '#c9a368',
      border: 'linear-gradient(135deg, #b87333, #f5deb3, #b87333) 1',
      bg: 'linear-gradient(180deg, rgba(184,115,51,0.05), rgba(10,10,18,0.6))',
      features: [
        'Universal Adaptive AI Engine — Copper features only',
        'Any language, any engine, JSON protocol',
        'Plugin architecture, enemy counter-AI, smart hints',
        'HTTP & CLI server, zero dependencies',
        'Updates included for the licensed year',
      ],
    },
    {
      id: 'diamond',
      label: 'Diamond Tier — Full AI',
      price: '$50',
      accent: '#a8c8ff',
      border: 'linear-gradient(135deg, #7fb3ff, #e0f0ff, #7fb3ff) 1',
      bg: 'linear-gradient(180deg, rgba(127,179,255,0.06), rgba(10,10,18,0.6))',
      features: [
        'Everything in Copper',
        'Dynamic Difficulty adaptation',
        'FPS / TPS Aim Assist',
        'VR / XR Ready spatial modules',
        'Voice Replication engine',
      ],
    },
  ];

  const ownsTier = (id: AITier) => owned === id || (owned === 'diamond' && id === 'copper');

  if (selectedTier) {
    const returnUrl = `${window.location.origin}/adaptive-ai/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
    return (
      <div className="w-full min-h-screen bg-[#0a0a12] px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <button
            type="button"
            onClick={() => setSelectedTier(null)}
            className="text-[#6a6a7a] font-serif text-sm hover:text-[#a8c8ff] transition-colors"
          >
            ← Choose a different tier
          </button>
          <h1 className="text-3xl font-serif text-[#e8e8f0] tracking-wider">
            Complete your purchase
          </h1>
          <div className="bg-white rounded-lg p-2">
            <StripeEmbeddedCheckout
              priceId={PRICE_IDS[selectedTier]}
              customerEmail={user?.email}
              userId={user?.id}
              returnUrl={returnUrl}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center relative overflow-hidden select-none px-6 py-12">
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(168,200,255,0.4) 0%, transparent 70%)' }}
      />

      <div className="z-10 max-w-5xl w-full text-center space-y-8">
        <Link
          to="/adaptive-ai"
          className="inline-block text-[#6a6a7a] font-serif text-sm hover:text-[#a8c8ff] transition-colors"
        >
          ← Back to Adaptive AI
        </Link>

        <h1 className="text-4xl sm:text-5xl font-serif text-[#e8e8f0] tracking-wider">
          Unlock the Adaptive AI Engine
        </h1>

        <p className="text-[#8a8a9a] font-serif text-lg leading-relaxed max-w-2xl mx-auto">
          The Hollow Knight demo will always be free. Choose a license tier to
          download the Universal Adaptive AI Engine ({format}).
        </p>

        <div className="grid md:grid-cols-2 gap-6 text-left">
          {tiers.map((t) => {
            const has = ownsTier(t.id);
            return (
              <div
                key={t.id}
                className="rounded-lg border-2 p-8 space-y-4 flex flex-col"
                style={{
                  borderImage: t.border,
                  background: t.bg,
                  boxShadow: has ? `0 0 0 2px ${t.accent} inset` : undefined,
                }}
              >
                <div
                  className="font-serif uppercase tracking-[0.3em] text-xs"
                  style={{ color: t.accent }}
                >
                  {t.label}
                  {has && <span className="ml-2 text-[#8a8a9a] normal-case tracking-normal">· Active</span>}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-serif text-[#e8e8f0]">{t.price}</span>
                  <span className="text-[#8a8a9a] font-serif">/ year</span>
                </div>
                <ul className="text-[#8a8a9a] font-serif text-sm space-y-2 pt-2 flex-1">
                  {t.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => (has ? (window.location.href = `/adaptive-ai?format=${formatParam}`) : handleSelect(t.id))}
                  className="mt-4 px-6 py-3 bg-[#1a1a2a] border-2 font-serif tracking-[0.2em] uppercase text-xs transition-all hover:bg-[#2a2a3a]"
                  style={{ borderColor: t.accent, color: '#e8e8f0' }}
                >
                  {has ? 'Return to download' : `Subscribe — ${t.price}/yr`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[#5a5a6a] font-serif text-xs max-w-md mx-auto">
          Secure checkout. Subscriptions renew yearly and can be canceled at any time.
        </p>
      </div>
    </div>
  );
};

export default AdaptiveAICheckout;
