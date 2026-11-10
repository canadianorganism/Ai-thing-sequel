-- Restrict UPDATE on user_roles to admins only
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Restrict DELETE on user_roles to admins only
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow users to delete their own game saves
CREATE POLICY "Users can delete their own saves"
ON public.game_saves
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);