import { useState, useEffect, useCallback } from 'react';
import { supabase, type Subject, type Question, type Test } from '@/lib/supabase';
import { FileText, Sparkles, ArrowRight, Trash2, Clock, Award } from 'lucide-react';

interface Props {
  subjects: Subject[];
  onTestGenerated: (test: Test) => void;
  refreshKey: number;
}

interface GenConfig {
  mcqCount: number;
  shortCount: number;
  longCount: number;
  mcqMarks: number;
  shortMarks: number;
  longMarks: number;
  duration: number;
  difficultyMix: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  title: string;
  instructions: string;
}

export default function TestGenerator({ subjects, onTestGenerated, refreshKey }: Props) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);

  const [config, setConfig] = useState<GenConfig>({
    mcqCount: 10,
    shortCount: 5,
    longCount: 3,
    mcqMarks: 1,
    shortMarks: 3,
    longMarks: 5,
    duration: 180,
    difficultyMix: 'Mixed',
    title: '',
    instructions: 'Read all questions carefully. All questions are compulsory.',
  });

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || null;

  const loadQuestions = useCallback(async () => {
    if (!selectedSubjectId) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', selectedSubjectId)
      .order('created_at', { ascending: false });
    setQuestions(data || []);
    setLoading(false);
  }, [selectedSubjectId]);

  const loadTests = useCallback(async () => {
    const { data } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
    setTests(data || []);
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions, refreshKey]);

  useEffect(() => {
    loadTests();
  }, [loadTests, refreshKey]);

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const pickQuestions = (type: string, count: number): Question[] => {
    let pool = questions.filter((q) => q.question_type === type);
    if (config.difficultyMix !== 'Mixed') {
      const filtered = pool.filter((q) => q.difficulty === config.difficultyMix);
      if (filtered.length >= count) pool = filtered;
    }
    return shuffle(pool).slice(0, count);
  };

  const totalMarks = config.mcqCount * config.mcqMarks + config.shortCount * config.shortMarks + config.longCount * config.longMarks;

  const handleGenerate = async () => {
    if (!selectedSubjectId || !selectedSubject) return;

    const mcqs = pickQuestions('MCQ', config.mcqCount);
    const shorts = pickQuestions('Short', config.shortCount);
    const longs = pickQuestions('Long', config.longCount);

    const totalAvailable = mcqs.length + shorts.length + longs.length;
    if (totalAvailable === 0) {
      alert('No questions available for the selected subject. Add questions first.');
      return;
    }

    const shortage = (config.mcqCount - mcqs.length) + (config.shortCount - shorts.length) + (config.longCount - longs.length);
    if (shortage > 0) {
      const proceed = confirm(
        `Only ${totalAvailable} questions available (requested ${config.mcqCount + config.shortCount + config.longCount}). ` +
        `Generate test with ${totalAvailable} questions?`
      );
      if (!proceed) return;
    }

    setGenerating(true);

    const title = config.title.trim() || `${selectedSubject.name} - Class ${selectedSubject.class_level} Test`;

    const { data: testData, error: testError } = await supabase
      .from('tests')
      .insert({
        title,
        subject_id: selectedSubjectId,
        class_level: selectedSubject.class_level,
        duration_minutes: config.duration,
        total_marks: mcqs.length * config.mcqMarks + shorts.length * config.shortMarks + longs.length * config.longMarks,
        instructions: config.instructions,
      })
      .select()
      .single();

    if (testError || !testData) {
      alert('Could not create test: ' + (testError?.message || 'Unknown error'));
      setGenerating(false);
      return;
    }

    const rows: { test_id: string; question_id: string; question_number: number; section_label: string; marks: number }[] = [];
    let qNum = 1;

    mcqs.forEach((q) => {
      rows.push({ test_id: testData.id, question_id: q.id, question_number: qNum++, section_label: 'A', marks: config.mcqMarks });
    });
    shorts.forEach((q) => {
      rows.push({ test_id: testData.id, question_id: q.id, question_number: qNum++, section_label: 'B', marks: config.shortMarks });
    });
    longs.forEach((q) => {
      rows.push({ test_id: testData.id, question_id: q.id, question_number: qNum++, section_label: 'C', marks: config.longMarks });
    });

    if (rows.length > 0) {
      const { error: tqError } = await supabase.from('test_questions').insert(rows);
      if (tqError) {
        alert('Test created but questions could not be linked: ' + tqError.message);
      }
    }

    setGenerating(false);
    window.dispatchEvent(new CustomEvent('db-changed'));
    onTestGenerated(testData);
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Delete this test paper? This cannot be undone.')) return;
    const { error } = await supabase.from('tests').delete().eq('id', id);
    if (error) {
      alert('Could not delete test.');
      return;
    }
    loadTests();
    window.dispatchEvent(new CustomEvent('db-changed'));
  };

  const mcqAvailable = questions.filter((q) => q.question_type === 'MCQ').length;
  const shortAvailable = questions.filter((q) => q.question_type === 'Short').length;
  const longAvailable = questions.filter((q) => q.question_type === 'Long').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Generate Test Paper</h2>
        <p className="text-slate-500 mt-1">Auto-generate a CBSE-style test from your question bank</p>
      </div>

      {/* Step 1: Choose Subject */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="font-semibold text-slate-800">Choose a Subject</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {subjects.length === 0 && (
            <p className="text-slate-400 text-sm">No subjects yet. Add some in the Question Bank tab first.</p>
          )}
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedSubjectId === s.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-teal-400'
              }`}
            >
              {s.name} · Class {s.class_level}
            </button>
          ))}
        </div>
        {selectedSubject && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center bg-blue-50 rounded-lg py-3">
              <p className="text-2xl font-bold text-blue-700">{mcqAvailable}</p>
              <p className="text-xs text-blue-600 font-medium">MCQs</p>
            </div>
            <div className="text-center bg-amber-50 rounded-lg py-3">
              <p className="text-2xl font-bold text-amber-700">{shortAvailable}</p>
              <p className="text-xs text-amber-600 font-medium">Short Answer</p>
            </div>
            <div className="text-center bg-purple-50 rounded-lg py-3">
              <p className="text-2xl font-bold text-purple-700">{longAvailable}</p>
              <p className="text-xs text-purple-600 font-medium">Long Answer</p>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Configure */}
      {selectedSubjectId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">2</span>
            <h3 className="font-semibold text-slate-800">Configure Paper</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Test Title (optional)</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              placeholder={`e.g. ${selectedSubject?.name} Mid-Term Exam`}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MCQ Section */}
            <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/30 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-medium text-slate-700 text-sm">Section A — MCQ</span>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Count ({mcqAvailable} available)</label>
                <input
                  type="number" min={0} max={50}
                  value={config.mcqCount}
                  onChange={(e) => setConfig({ ...config, mcqCount: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Marks each</label>
                <input
                  type="number" min={1} max={10}
                  value={config.mcqMarks}
                  onChange={(e) => setConfig({ ...config, mcqMarks: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Short Section */}
            <div className="border border-amber-100 rounded-lg p-4 bg-amber-50/30 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-medium text-slate-700 text-sm">Section B — Short</span>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Count ({shortAvailable} available)</label>
                <input
                  type="number" min={0} max={50}
                  value={config.shortCount}
                  onChange={(e) => setConfig({ ...config, shortCount: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Marks each</label>
                <input
                  type="number" min={1} max={20}
                  value={config.shortMarks}
                  onChange={(e) => setConfig({ ...config, shortMarks: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Long Section */}
            <div className="border border-purple-100 rounded-lg p-4 bg-purple-50/30 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="font-medium text-slate-700 text-sm">Section C — Long</span>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Count ({longAvailable} available)</label>
                <input
                  type="number" min={0} max={50}
                  value={config.longCount}
                  onChange={(e) => setConfig({ ...config, longCount: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Marks each</label>
                <input
                  type="number" min={1} max={20}
                  value={config.longMarks}
                  onChange={(e) => setConfig({ ...config, longMarks: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Duration (minutes)</label>
              <input
                type="number" min={30} max={300}
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: Math.max(30, parseInt(e.target.value) || 180) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Difficulty</label>
              <select
                value={config.difficultyMix}
                onChange={(e) => setConfig({ ...config, difficultyMix: e.target.value as GenConfig['difficultyMix'] })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                <option value="Mixed">Mixed (all levels)</option>
                <option value="Easy">Easy only</option>
                <option value="Medium">Medium only</option>
                <option value="Hard">Hard only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Instructions</label>
            <textarea
              value={config.instructions}
              onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-y"
            />
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{totalMarks}</p>
                  <p className="text-xs text-slate-500">Total Marks</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{config.duration}</p>
                  <p className="text-xs text-slate-500">Minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{config.mcqCount + config.shortCount + config.longCount}</p>
                  <p className="text-xs text-slate-500">Questions</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Test Paper
              </>
            )}
          </button>
        </div>
      )}

      {/* Previously generated tests */}
      {tests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Previously Generated Tests</h3>
          {tests.map((t) => {
            const subj = subjects.find((s) => s.id === t.subject_id);
            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => onTestGenerated(t)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{t.title}</p>
                    <p className="text-sm text-slate-500">
                      {subj ? `${subj.name} · Class ${t.class_level}` : 'Unknown subject'}
                      {' · '}{t.total_marks} marks · {t.duration_minutes} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onTestGenerated(t); }}
                    className="text-teal-600 hover:text-teal-700 font-medium text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTest(t.id); }}
                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
