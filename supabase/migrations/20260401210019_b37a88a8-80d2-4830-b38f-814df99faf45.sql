
ALTER TABLE public.ai_reviews ADD CONSTRAINT ai_reviews_one_per_user UNIQUE (user_id);

CREATE POLICY "Users can update their own review"
  ON public.ai_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
