import { supabase } from '@/integrations/supabase/client';

export type FunnelEventName =
  | 'download_attempt'
  | 'download_success'
  | 'checkout_view'
  | 'checkout_click'
  | 'payment_success';

const SESSION_KEY = 'funnel_session_id';

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'no-session';
  }
}

/**
 * Fire-and-forget funnel event recorder. Failures are swallowed so analytics
 * never break the user flow.
 */
export async function trackFunnelEvent(
  event: FunnelEventName,
  options?: { format?: 'ts' | 'js' | 'exe'; metadata?: Record<string, unknown> }
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;

    await supabase.from('funnel_events').insert({
      event_name: event,
      user_id: userId,
      session_id: getSessionId(),
      format: options?.format ?? null,
      metadata: (options?.metadata ?? {}) as never,
    });
  } catch (err) {
    // Intentionally silent — analytics must never disrupt UX.
    if (import.meta.env.DEV) {
      console.warn('[funnel] failed to record event', event, err);
    }
  }
}
