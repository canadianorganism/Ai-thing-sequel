
DO $$ BEGIN
  CREATE TYPE public.ai_tier AS ENUM ('copper', 'diamond');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ai_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier public.ai_tier NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entitlement" ON public.ai_entitlements;
CREATE POLICY "Users can view own entitlement"
  ON public.ai_entitlements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for clients — only the service role
-- (used by edge functions) bypasses RLS and can write here.

DROP TRIGGER IF EXISTS ai_entitlements_updated_at ON public.ai_entitlements;
CREATE TRIGGER ai_entitlements_updated_at
  BEFORE UPDATE ON public.ai_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
