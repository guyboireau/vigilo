-- ============================================================
-- Fix RLS on plans (Vigilo) + Jarvis CRM tables
-- ============================================================

-- PLANS: public read for authenticated users, service_role write only
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans: authenticated read"
  ON public.plans FOR SELECT
  TO authenticated
  USING (true);

-- Jarvis CRM tables: no user_id column → service_role access only
-- (accessed from Jarvis agent via service_role key, not from browser)

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prospects: service role only"
  ON public.prospects FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs: service role only"
  ON public.briefs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents: service role only"
  ON public.documents FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages: service role only"
  ON public.messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes: service role only"
  ON public.quotes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.past_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "past_projects: service role only"
  ON public.past_projects FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
