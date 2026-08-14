import { useState, useEffect } from 'react';
import { supabase, type Test, type Question, type Subject } from '@/lib/supabase';
import { ArrowLeft, Printer, Eye, FileText, Clock, Award, CheckCircle, Download } from 'lucide-react';

interface Props {
  test: Test;
  subjects: Subject[];
  onBack: () => void;
}

interface TestQuestionRow {
  id: string;
  test_id: string;
  question_id: string;
  question_number: number;
  section_label: string;
  marks: number;
  question?: Question;
}

export default function TestPreview({ test, subjects, onBack }: Props) {
  const [rows, setRows] = useState<TestQuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('test_questions')
        .select(`
          id, test_id, question_id, question_number, section_label, marks,
          question:questions(*)
        `)
        .eq('test_id', test.id)
        .order('question_number', { ascending: true });

      if (error) {
        console.error('Error loading test questions:', error.message);
      }
      const normalized = (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        question: Array.isArray(r.question) ? (r.question[0] as Question) : (r.question as Question | undefined),
      })) as TestQuestionRow[];
      setRows(normalized);
      setLoading(false);
    })();
  }, [test.id]);

  const subject = subjects.find((s) => s.id === test.subject_id);

  const sectionA = rows.filter((r) => r.section_label === 'A');
  const sectionB = rows.filter((r) => r.section_label === 'B');
  const sectionC = rows.filter((r) => r.section_label === 'C');

  const sectionInfo: { label: string; title: string; rows: TestQuestionRow[]; marks: number }[] = [
    { label: 'A', title: 'Section A — Multiple Choice Questions', rows: sectionA, marks: sectionA[0]?.marks || 1 },
    { label: 'B', title: 'Section B — Short Answer Questions', rows: sectionB, marks: sectionB[0]?.marks || 3 },
    { label: 'C', title: 'Section C — Long Answer Questions', rows: sectionC, marks: sectionC[0]?.marks || 5 },
  ].filter((s) => s.rows.length > 0);

  const handlePrint = () => {
    setShowAnswers(false);
    setTimeout(() => window.print(), 100);
  };

  const handleExportPDF = () => {
    setShowAnswers(false);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar (hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-600 font-medium hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Generator
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors ${
              showAnswers
                ? 'border-teal-600 text-teal-700 bg-teal-50'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-4 h-4" />
            {showAnswers ? 'Hide Answers' : 'Show Answer Key'}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Paper Header */}
          <div className="paper-header border-b-2 border-slate-300 p-6 sm:p-8 text-center">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span>Roll No: ___________</span>
              <span>Date: ___/___/______</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              CBSE Assessment Examination
            </h1>
            <div className="mt-3 flex items-center justify-center gap-4 text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {subject ? `${subject.name}` : 'Subject'}
              </span>
              <span className="text-slate-300">|</span>
              <span>Class {test.class_level}</span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {test.duration_minutes} min
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                {test.total_marks} marks
              </span>
            </div>
            <div className="mt-4 bg-slate-50 rounded-lg p-3 text-sm text-slate-600 max-w-2xl mx-auto">
              <span className="font-semibold">Instructions: </span>{test.instructions}
            </div>
          </div>

          {/* Sections */}
          <div className="p-6 sm:p-8 space-y-8">
            {sectionInfo.map((section) => (
              <div key={section.label}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800">{section.title}</h2>
                  <span className="text-sm text-slate-500 font-medium">
                    {section.rows.length} question{section.rows.length > 1 ? 's' : ''} × {section.marks} = {section.rows.length * section.marks} marks
                  </span>
                </div>
                <ol className="space-y-4">
                  {section.rows.map((row, idx) => {
                    const q = row.question;
                    if (!q) return null;
                    return (
                      <li key={row.id} className="flex gap-3">
                        <span className="font-bold text-slate-700 shrink-0 min-w-[2rem]">
                          {idx + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-slate-800 font-medium">{q.question_text}</p>
                            <span className="text-sm text-slate-500 font-medium shrink-0">
                              [{row.marks}]
                            </span>
                          </div>
                          {q.question_type === 'MCQ' && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 pl-2">
                              <span className={showAnswers && q.correct_answer.toUpperCase() === 'A' ? 'font-bold text-teal-700' : ''}>
                                (A) {q.option_a}
                                {showAnswers && q.correct_answer.toUpperCase() === 'A' && <CheckCircle className="w-3.5 h-3.5 inline ml-1 text-teal-600" />}
                              </span>
                              <span className={showAnswers && q.correct_answer.toUpperCase() === 'B' ? 'font-bold text-teal-700' : ''}>
                                (B) {q.option_b}
                                {showAnswers && q.correct_answer.toUpperCase() === 'B' && <CheckCircle className="w-3.5 h-3.5 inline ml-1 text-teal-600" />}
                              </span>
                              <span className={showAnswers && q.correct_answer.toUpperCase() === 'C' ? 'font-bold text-teal-700' : ''}>
                                (C) {q.option_c}
                                {showAnswers && q.correct_answer.toUpperCase() === 'C' && <CheckCircle className="w-3.5 h-3.5 inline ml-1 text-teal-600" />}
                              </span>
                              <span className={showAnswers && q.correct_answer.toUpperCase() === 'D' ? 'font-bold text-teal-700' : ''}>
                                (D) {q.option_d}
                                {showAnswers && q.correct_answer.toUpperCase() === 'D' && <CheckCircle className="w-3.5 h-3.5 inline ml-1 text-teal-600" />}
                              </span>
                            </div>
                          )}
                          {q.question_type !== 'MCQ' && showAnswers && (
                            <p className="mt-2 text-sm text-teal-700 font-medium border-l-2 border-teal-400 pl-3 bg-teal-50/50 py-1.5 rounded-r">
                              <span className="font-semibold">Answer: </span>{q.correct_answer}
                            </p>
                          )}
                          {q.question_type === 'Long' && !showAnswers && (
                            <div className="mt-2 space-y-1">
                              <div className="h-px bg-slate-100 w-full" />
                              <div className="h-px bg-slate-100 w-full" />
                              <div className="h-px bg-slate-100 w-full" />
                            </div>
                          )}
                          {q.question_type === 'Short' && !showAnswers && (
                            <div className="mt-2 space-y-1">
                              <div className="h-px bg-slate-100 w-full" />
                              <div className="h-px bg-slate-100 w-3/4" />
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}

            {sectionInfo.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>This test has no questions.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-slate-300 p-6 text-center text-sm text-slate-500">
            <p className="font-medium">*** End of Question Paper ***</p>
          </div>
        </div>
      )}
    </div>
  );
}
