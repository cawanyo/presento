/*
# Simplify admin auth — remove Supabase Auth requirement

## Changes
1. Drop user_id column from presentations (no longer tied to auth.users)
2. Change all RLS policies to allow anon CRUD (admin access is controlled by a frontend code)
3. Remove the admin user from auth.users (no longer needed)

## Security
- Admin access is gated by a secret code in the frontend (ICCToulouse2026)
- All database operations allow the anon role since there's no auth session
- This is a single-admin app where the code is the only protection

## Notes
- The user_id column is dropped with a migration, not ALTER, to avoid data loss concerns
- All policies now use TO anon, authenticated with USING (true) / WITH CHECK (true)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "select_presentations" ON presentations;
DROP POLICY IF EXISTS "insert_presentations" ON presentations;
DROP POLICY IF EXISTS "update_presentations" ON presentations;
DROP POLICY IF EXISTS "delete_presentations" ON presentations;

DROP POLICY IF EXISTS "select_questions" ON questions;
DROP POLICY IF EXISTS "insert_questions" ON questions;
DROP POLICY IF EXISTS "update_questions" ON questions;
DROP POLICY IF EXISTS "delete_questions" ON questions;

DROP POLICY IF EXISTS "insert_responses" ON responses;
DROP POLICY IF EXISTS "select_responses" ON responses;

DROP POLICY IF EXISTS "insert_participants" ON participants;
DROP POLICY IF EXISTS "select_participants" ON participants;

-- Remove user_id column (set to nullable first, then drop)
ALTER TABLE presentations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE presentations DROP CONSTRAINT IF EXISTS presentations_user_id_fkey;
ALTER TABLE presentations DROP COLUMN IF EXISTS user_id;

-- ── New policies: allow anon CRUD on everything ────────────

-- presentations
CREATE POLICY "anon_crud_presentations" ON presentations FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- questions
CREATE POLICY "anon_crud_questions" ON questions FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- responses
CREATE POLICY "anon_crud_responses" ON responses FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- participants
CREATE POLICY "anon_crud_participants" ON participants FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Remove admin user from auth.users
DELETE FROM auth.users WHERE email = 'admin@presento.app';