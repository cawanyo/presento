/*
# Presento — Interactive Presentation App Schema

## Overview
Database schema for a Mentimeter-like app where a single admin creates
interactive presentations and anonymous participants join via link or QR code
to answer questions in real time.

## New Tables

### presentations
Main table storing each presentation created by the admin.
- `id` (uuid PK) — unique identifier
- `title` (text, not null) — presentation title
- `join_code` (text, unique) — 6-character code participants use to join
- `status` (text, default 'draft') — one of: draft, active, ended
- `current_question_id` (uuid, nullable) — which question is currently displayed
- `user_id` (uuid, defaults to auth.uid()) — the admin who owns this presentation
- `created_at` (timestamptz)

### questions
Individual questions within a presentation, supporting multiple types.
- `id` (uuid PK)
- `presentation_id` (uuid FK → presentations, cascade delete)
- `type` (text) — one of: multiple_choice, word_cloud, open_text, rating, quiz
- `title` (text) — the question prompt
- `options` (jsonb) — array of option strings for choice/quiz types
- `correct_option` (integer, nullable) — index of correct answer for quiz type
- `position` (integer, default 0) — display order
- `created_at` (timestamptz)

### responses
Participant answers to questions.
- `id` (uuid PK)
- `question_id` (uuid FK → questions, cascade delete)
- `participant_id` (text) — client-generated unique ID per participant
- `participant_name` (text, nullable) — optional first name
- `answer` (text) — selected option text or typed response
- `created_at` (timestamptz)

### participants
Tracks who has joined each presentation (for live participant count).
- `id` (text PK) — client-generated unique ID
- `presentation_id` (uuid FK → presentations, cascade delete)
- `name` (text, nullable) — optional first name
- `joined_at` (timestamptz)

## Security (RLS)

### presentations
- SELECT: public (anon + authenticated) — participants find presentations by join code
- INSERT/UPDATE/DELETE: authenticated only, owner-scoped via auth.uid() = user_id

### questions
- SELECT: public (anon + authenticated) — participants see the current question
- INSERT/UPDATE/DELETE: authenticated only, scoped through presentation ownership

### responses
- INSERT: public (anon + authenticated) — participants submit answers
- SELECT: authenticated only, scoped through presentation ownership — admin sees results

### participants
- INSERT: public (anon + authenticated) — participants join
- SELECT: authenticated only, scoped through presentation ownership — admin sees count

## Admin User
A predefined admin account is created in auth.users:
- Email: admin@presento.app
- Password: Presento2024!

## Notes
1. current_question_id has no FK constraint to avoid circular dependency with questions table
2. All participant-accessible operations allow the anon role (no sign-in for participants)
3. Realtime subscriptions work through the same RLS policies
4. The admin password is hashed with bcrypt via pgcrypto's crypt() function
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  join_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  current_question_id uuid,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id uuid NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'multiple_choice' CHECK (type IN ('multiple_choice', 'word_cloud', 'open_text', 'rating', 'quiz')),
  title text NOT NULL,
  options jsonb,
  correct_option integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  participant_id text NOT NULL,
  participant_name text,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id text PRIMARY KEY,
  presentation_id uuid NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  name text,
  joined_at timestamptz DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- ── Policies: presentations ─────────────────────────────────

DROP POLICY IF EXISTS "select_presentations" ON presentations;
CREATE POLICY "select_presentations" ON presentations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_presentations" ON presentations;
CREATE POLICY "insert_presentations" ON presentations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_presentations" ON presentations;
CREATE POLICY "update_presentations" ON presentations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_presentations" ON presentations;
CREATE POLICY "delete_presentations" ON presentations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── Policies: questions ────────────────────────────────────

DROP POLICY IF EXISTS "select_questions" ON questions;
CREATE POLICY "select_questions" ON questions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_questions" ON questions;
CREATE POLICY "insert_questions" ON questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM presentations p WHERE p.id = questions.presentation_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_questions" ON questions;
CREATE POLICY "update_questions" ON questions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM presentations p WHERE p.id = questions.presentation_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM presentations p WHERE p.id = questions.presentation_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_questions" ON questions;
CREATE POLICY "delete_questions" ON questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM presentations p WHERE p.id = questions.presentation_id AND p.user_id = auth.uid())
  );

-- ── Policies: responses ────────────────────────────────────

DROP POLICY IF EXISTS "insert_responses" ON responses;
CREATE POLICY "insert_responses" ON responses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_responses" ON responses;
CREATE POLICY "select_responses" ON responses FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM questions q
      JOIN presentations p ON q.presentation_id = p.id
      WHERE q.id = responses.question_id AND p.user_id = auth.uid()
    )
  );

-- ── Policies: participants ──────────────────────────────────

DROP POLICY IF EXISTS "insert_participants" ON participants;
CREATE POLICY "insert_participants" ON participants FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_participants" ON participants;
CREATE POLICY "select_participants" ON participants FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM presentations p WHERE p.id = participants.presentation_id AND p.user_id = auth.uid())
  );

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_questions_presentation ON questions(presentation_id, position);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_participants_presentation ON participants(presentation_id);
CREATE INDEX IF NOT EXISTS idx_presentations_join_code ON presentations(join_code);

-- ── Admin user ──────────────────────────────────────────────

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
SELECT
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@presento.app',
  crypt('Presento2024!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@presento.app');