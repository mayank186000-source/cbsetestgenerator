/*
# Create api_settings table

1. New Tables
- `api_settings` — stores API keys and settings for AI question generation, PDF export, and custom Supabase connection.
  - provider (e.g. 'openai', 'gemini')
  - api_key (encrypted server-side, stored as text)
  - settings (jsonb for additional config like custom supabase url/key)
  - is_active (boolean to toggle which provider is used)

2. Security
- Single-tenant app (no sign-in) — all tables allow anon + authenticated full CRUD.
- RLS enabled with USING(true) policies since data is intentionally shared.
*/

CREATE TABLE IF NOT EXISTS api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'openai',
  api_key text NOT NULL DEFAULT '',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_api_settings" ON api_settings;
CREATE POLICY "anon_select_api_settings" ON api_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_api_settings" ON api_settings;
CREATE POLICY "anon_insert_api_settings" ON api_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_api_settings" ON api_settings;
CREATE POLICY "anon_update_api_settings" ON api_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_api_settings" ON api_settings;
CREATE POLICY "anon_delete_api_settings" ON api_settings FOR DELETE TO anon, authenticated USING (true);
