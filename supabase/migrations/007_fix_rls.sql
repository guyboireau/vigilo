-- Fix recursive RLS on organization_members
-- Old policy queried organization_members from within organization_members policy → infinite recursion → 500

DROP POLICY IF EXISTS "org_members: org members read" ON public.organization_members;
DROP POLICY IF EXISTS "org_members: owner/admin manage" ON public.organization_members;

-- A user can read:
--   1. Their own membership row (no recursion)
--   2. All members of orgs they own (checked against organizations, no recursion)
CREATE POLICY "org_members: self read"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "org_members: owner read all"
  ON public.organization_members FOR SELECT
  USING (
    exists (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_id AND o.owner_id = auth.uid()
    )
  );

-- Insert/update/delete: org owner or self-remove
CREATE POLICY "org_members: owner manage"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    exists (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_id AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "org_members: owner update"
  ON public.organization_members FOR UPDATE
  USING (
    exists (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_id AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "org_members: owner or self delete"
  ON public.organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR exists (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_id AND o.owner_id = auth.uid()
    )
  );

-- Also fix is_org_member helper — remove recursion by checking only organizations table for owner
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT exists (
    SELECT 1 FROM public.organizations o
    WHERE o.id = p_org_id AND o.owner_id = auth.uid()
  )
$$;

-- org_with_plan view: needs RLS bypass for members
-- Expose a security definer function to check membership without recursion
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT array_agg(org_id)
  FROM public.organization_members
  WHERE user_id = auth.uid()
$$;
