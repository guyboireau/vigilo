-- HTTP monitors
CREATE TABLE IF NOT EXISTS http_monitors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  url text NOT NULL,
  expected_status integer DEFAULT 200,
  interval_minutes integer DEFAULT 15,
  enabled boolean DEFAULT true,
  last_status text,
  last_checked_at timestamptz,
  last_response_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE http_monitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own monitors" ON http_monitors FOR ALL USING (auth.uid() = user_id);

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email_on_failure boolean DEFAULT true,
  email_on_recovery boolean DEFAULT true,
  email_daily boolean DEFAULT true,
  slack_webhook text,
  discord_webhook text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own notif settings" ON notification_settings FOR ALL USING (auth.uid() = user_id);

-- Status pages
CREATE TABLE IF NOT EXISTS status_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT 'Status',
  description text,
  project_ids uuid[] DEFAULT '{}',
  http_monitor_ids uuid[] DEFAULT '{}',
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE status_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own status pages" ON status_pages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "public read status pages" ON status_pages FOR SELECT USING (is_public = true);

-- Extend projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS check_interval_minutes integer DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS last_overall_status text;
