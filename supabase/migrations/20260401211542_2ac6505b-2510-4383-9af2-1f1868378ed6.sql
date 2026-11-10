
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.ai_reviews;
CREATE POLICY "Authenticated non-banned users can create reviews"
  ON public.ai_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));
