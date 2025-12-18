-- Fix contacts RLS policy to allow inserts from any role
-- The previous policy only allowed 'anon' role, but server-side requests may use different roles

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Anyone can insert contacts" ON public.contacts;

-- Create a new policy that allows inserts from both anon and authenticated roles
CREATE POLICY "Anyone can insert contacts" ON public.contacts
  FOR INSERT WITH CHECK (true);

-- Also ensure authenticated users can delete contacts (for admin cleanup)
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;
CREATE POLICY "Authenticated users can delete contacts" ON public.contacts
  FOR DELETE TO authenticated USING (true);
