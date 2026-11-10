import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchEntitlement, type AITier } from "@/lib/entitlements";
import { trackFunnelEvent } from "@/lib/funnel";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [tier, setTier] = useState<AITier | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts++;
      const t = await fetchEntitlement();
      if (cancelled) return;
      if (t) {
        setTier(t);
        setPolling(false);
        void trackFunnelEvent('payment_success', { metadata: { tier: t, session_id: sessionId } });
        return;
      }
      if (attempts >= 15) {
        setPolling(false);
        return;
      }
      setTimeout(tick, 2000);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="w-full min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="max-w-xl space-y-6">
        <h1 className="text-3xl font-serif text-[#e8e8f0] tracking-wider">
          {tier ? "Payment Complete" : polling ? "Confirming Payment…" : "Almost Done"}
        </h1>
        {tier && (
          <p className="text-[#8a8a9a] font-serif">
            Your <span className="text-[#a8c8ff]">{tier}</span> license is active. You can now
            download the Adaptive AI Engine.
          </p>
        )}
        {!tier && polling && (
          <p className="text-[#8a8a9a] font-serif text-sm">
            Waiting for confirmation from the payment processor…
          </p>
        )}
        {!tier && !polling && (
          <p className="text-[#8a8a9a] font-serif text-sm">
            Confirmation is taking longer than expected. Refresh the download page in a minute —
            your license will appear there once processed.
          </p>
        )}
        {sessionId && (
          <p className="text-[#5a5a6a] font-serif text-[11px]">Session: {sessionId}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Link
            to="/adaptive-ai"
            className="px-5 py-2 border border-[#a8c8ff] text-[#e8e8f0] font-serif tracking-[0.2em] uppercase text-xs hover:bg-[#1a1a2a]"
          >
            Back to download
          </Link>
        </div>
      </div>
    </div>
  );
}
