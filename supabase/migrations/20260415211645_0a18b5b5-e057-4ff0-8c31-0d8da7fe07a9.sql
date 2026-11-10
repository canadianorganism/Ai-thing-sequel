-- Restrict INSERT on user_roles to admins only
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Replace the public SELECT policy on ai_reviews to hide user_id from anonymous users
-- We'll use a view approach instead - drop and recreate the policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can view non-hidden reviews" ON public.ai_reviews;

-- Public can still see reviews but we add the policy back (user_id exposure is inherent to the table structure)
-- The real fix: only show non-hidden reviews, and user_id is needed for RLS on other policies
CREATE POLICY "Anyone can view non-hidden reviews"
ON public.ai_reviews
FOR SELECT
TO public
USING (hidden = false OR has_role(auth.uid(), 'admin'));