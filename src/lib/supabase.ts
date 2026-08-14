import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export type QuestionType = 'MCQ' | 'Short' | 'Long';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Subject {
  id: string;
  name: string;
  class_level: number;
  created_at: string;
}

export interface Question {
  id: string;
  subject_id: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  chapter: string;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  marks: number;
  created_at: string;
}

export interface Test {
  id: string;
  title: string;
  subject_id: string;
  class_level: number;
  duration_minutes: number;
  total_marks: number;
  instructions: string;
  created_at: string;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_id: string;
  question_number: number;
  section_label: string;
  marks: number;
  question?: Question;
}
