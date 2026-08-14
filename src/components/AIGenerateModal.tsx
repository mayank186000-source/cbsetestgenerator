import { useState } from 'react';
import { supabase, type QuestionType, type Difficulty, type Subject } from '@/lib/supabase';
import { Sparkles, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  subject: Subject;
  onClose: () => void;
  onGenerated: () => void;
}

interface ApiSettings {
  provider: 'openai' | 'gemini';
  api_key: string;
}

export default function AIGenerateModal({ subject, onClose, onGenerated }: Props) {
  const [questionType, setQuestionType] = useState<QuestionType>('MCQ');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [count, setCount] = useState(5);
  const [chapter, setChapter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  const handleGenerate = async () => {
    setGenerating(true);
    setStatus(null);
    setGeneratedCount(0);

    // Load saved API settings
    const { data: settingsData } = await supabase
      .from('api_settings')
      .select('provider, api_key')
      .limit(1)
      .maybeSingle();

    if (!settingsData || !(settingsData as ApiSettings).api_key) {
      setStatus({
        type: 'error',
        message: 'No API key found. Go to Settings to add your OpenAI or Gemini API key first.',
      });
      setGenerating(false);
      return;
    }

    const settings = settingsData as ApiSettings;

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`;
    try {
      const resp = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subject: subject.name,
          classLevel: subject.class_level,
          chapter: chapter.trim() || undefined,
          questionType,
          difficulty,
          count,
          provider: settings.provider,
          apiKey: settings.api_key,
        }),
      });

      const result = await resp.json();

      if (!resp.ok) {
        setStatus({ type: 'error', message: result.error || 'Failed to generate questions' });
        setGenerating(false);
        return;
      }

      const questions = result.questions as Record<string, string>[];
      if (!questions || questions.length === 0) {
        setStatus({ type: 'error', message: 'AI returned no questions. Try again.' });
        setGenerating(false);
        return;
      }

      // Insert generated questions into database
      const rows = questions.map((q) => ({
        subject_id: subject.id,
        question_type: questionType,
        difficulty,
        chapter: chapter.trim() || 'General',
        question_text: q.question_text,
        option_a: questionType === 'MCQ' ? q.option_a || null : null,
        option_b: questionType === 'MCQ' ? q.option_b || null : null,
        option_c: questionType === 'MCQ' ? q.option_c || null : null,
        option_d: questionType === 'MCQ' ? q.option_d || null : null,
        correct_answer: q.correct_answer || '',
        marks: questionType === 'MCQ' ? 1 : questionType === 'Short' ? 3 : 5,
      }));

      const { error: insertError } = await supabase.from('questions').insert(rows);
      if (insertError) {
        setStatus({ type: 'error', message: 'Questions generated but could not save: ' + insertError.message });
        setGenerating(false);
        return;
      }

      setGeneratedCount(rows.length);
      setStatus({ type: 'success', message: `${rows.length} questions generated and saved!` });
      setGenerating(false);
      onGenerated();
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Network error' });
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">AI Question Generator</h3>
              <p className="text-xs text-slate-500">{subject.name} · Class {subject.class_level}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status?.type === 'success' ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-medium text-slate-800">{status.message}</p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => { setStatus(null); setGeneratedCount(0); }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50"
              >
                Generate More
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Question Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="MCQ">Multiple Choice (1 mark each)</option>
                <option value="Short">Short Answer (3 marks each)</option>
                <option value="Long">Long Answer (5 marks each)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      difficulty === d
                        ? d === 'Easy' ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : d === 'Medium' ? 'bg-orange-100 text-orange-700 border-2 border-orange-500'
                        : 'bg-red-100 text-red-700 border-2 border-red-500'
                        : 'border border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Number of Questions
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-teal-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1</span>
                <span className="font-bold text-teal-600 text-sm">{count} questions</span>
                <span>20</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Chapter / Topic (optional)
              </label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. Algebra, Photosynthesis"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {status?.type === 'error' && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{status.message}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating questions...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate {count} {questionType} Question{count > 1 ? 's' : ''}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
