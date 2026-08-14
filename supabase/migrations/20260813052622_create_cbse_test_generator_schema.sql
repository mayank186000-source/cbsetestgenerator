/*
# CBSE Test Generator Schema

1. New Tables
- `subjects` — subjects (e.g. Mathematics, Science) for classes 6-12
- `questions` — question bank with type (MCQ/Short/Long), difficulty, marks, chapter
- `tests` — generated test papers with metadata
- `test_questions` — join table linking tests to questions

2. Security
- Single-tenant app (no sign-in) — all tables allow anon + authenticated full CRUD.
- RLS enabled on every table with USING(true) policies since data is intentionally shared.
*/

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_level int NOT NULL CHECK (class_level BETWEEN 1 AND 12),
  created_at timestamptz DEFAULT now(),
  UNIQUE (name, class_level)
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('MCQ', 'Short', 'Long')),
  difficulty text NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  chapter text NOT NULL DEFAULT 'General',
  question_text text NOT NULL,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text NOT NULL,
  marks int NOT NULL DEFAULT 1 CHECK (marks > 0),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_level int NOT NULL,
  duration_minutes int NOT NULL DEFAULT 180,
  total_marks int NOT NULL DEFAULT 0,
  instructions text NOT NULL DEFAULT 'Read all questions carefully. All questions are compulsory.',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_number int NOT NULL,
  section_label text NOT NULL DEFAULT 'A',
  marks int NOT NULL DEFAULT 1,
  UNIQUE (test_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_subjects" ON subjects;
CREATE POLICY "anon_select_subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subjects" ON subjects;
CREATE POLICY "anon_insert_subjects" ON subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subjects" ON subjects;
CREATE POLICY "anon_update_subjects" ON subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subjects" ON subjects;
CREATE POLICY "anon_delete_subjects" ON subjects FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_questions" ON questions;
CREATE POLICY "anon_select_questions" ON questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_questions" ON questions;
CREATE POLICY "anon_insert_questions" ON questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_questions" ON questions;
CREATE POLICY "anon_update_questions" ON questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_questions" ON questions;
CREATE POLICY "anon_delete_questions" ON questions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_tests" ON tests;
CREATE POLICY "anon_select_tests" ON tests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tests" ON tests;
CREATE POLICY "anon_insert_tests" ON tests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tests" ON tests;
CREATE POLICY "anon_update_tests" ON tests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tests" ON tests;
CREATE POLICY "anon_delete_tests" ON tests FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_test_questions" ON test_questions;
CREATE POLICY "anon_select_test_questions" ON test_questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_test_questions" ON test_questions;
CREATE POLICY "anon_insert_test_questions" ON test_questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_test_questions" ON test_questions;
CREATE POLICY "anon_update_test_questions" ON test_questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_test_questions" ON test_questions;
CREATE POLICY "anon_delete_test_questions" ON test_questions FOR DELETE TO anon, authenticated USING (true);
