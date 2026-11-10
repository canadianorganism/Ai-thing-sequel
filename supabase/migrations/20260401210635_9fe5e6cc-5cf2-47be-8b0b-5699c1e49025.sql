
-- Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles: anyone authenticated can read, only admins can modify
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Assign admin role to project owner
INSERT INTO public.user_roles (user_id, role)
VALUES ('a78a94e6-fa58-4a74-a220-d60fff8b438e', 'admin');

-- Add hidden column to ai_reviews
ALTER TABLE public.ai_reviews ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT false;

-- Admin can delete any review
CREATE POLICY "Admins can delete any review"
  ON public.ai_reviews FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any review (to hide/unhide)
CREATE POLICY "Admins can update any review"
  ON public.ai_reviews FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update select policy: non-admins only see non-hidden reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.ai_reviews;
CREATE POLICY "Anyone can view non-hidden reviews"
  ON public.ai_reviews FOR SELECT
  TO public
  USING (hidden = false OR public.has_role(auth.uid(), 'admin'));
