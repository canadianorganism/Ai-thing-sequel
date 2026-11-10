
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  event_name text NOT NULL,
  format text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funnel_events_event_name_check CHECK (
    event_name IN ('download_attempt','checkout_view','checkout_click','payment_success')
  )
);

CREATE INDEX IF NOT EXISTS funnel_events_event_name_idx ON public.funnel_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS funnel_events_session_idx ON public.funnel_events (session_id, created_at);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert their own funnel events"
  ON public.funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

CREATE POLICY "Admins can view funnel events"
  ON public.funnel_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
