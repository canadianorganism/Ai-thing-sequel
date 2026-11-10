
CREATE TABLE public.banned_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reason TEXT,
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.banned_reviewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bans"
  ON public.banned_reviewers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can ban users"
  ON public.banned_reviewers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can unban users"
  ON public.banned_reviewers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Also allow users to check if they themselves are banned (for showing UI message)
CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_reviewers WHERE user_id = _user_id
  )
$$;
