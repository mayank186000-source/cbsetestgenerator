import { useState, useEffect, useCallback } from 'react';
import { supabase, type Subject, type Question, type QuestionType, type Difficulty } from '@/lib/supabase';
import { BookOpen, Plus, Trash2, Search, Filter, X, Sparkles } from 'lucide-react';
import AIGenerateModal from '@/components/AIGenerateModal';

interface Props {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
  refreshKey: number;
}

export default function QuestionBank({ subjects, selectedSubjectId, onSelectSubject, refreshKey }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [newClass, setNewClass] = useState<string>('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  const [form, setForm] = useState({
    question_type: 'MCQ' as QuestionType,
    difficulty: 'Easy' as Difficulty,
    chapter: '',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: '',
    marks: 1,
  });

  const loadQuestions = useCallback(async () => {
    if (!selectedSubjectId) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', selectedSubjectId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error loading questions:', error.message);
    }
    setQuestions(data || []);
    setLoading(false);
  }, [selectedSubjectId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions, refreshKey]);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !newClass) return;
    const { error } = await supabase.from('subjects').insert({
      name: newSubjectName.trim(),
      class_level: parseInt(newClass),
    });
    if (error) {
      alert('Could not add subject. It may already exist.');
      return;
    }
    setNewSubjectName('');
    setNewClass('');
    setShowSubjectModal(false);
    window.dispatchEvent(new CustomEvent('db-changed'));
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Delete this subject and all its questions? This cannot be undone.')) return;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      alert('Could not delete subject.');
      return;
    }
    onSelectSubject(null);
    window.dispatchEvent(new CustomEvent('db-changed'));
  };

  const handleAddQuestion = async () => {
    if (!selectedSubjectId) return;
    if (!form.question_text.trim()) {
      alert('Please enter a question.');
      return;
    }
    if (form.question_type === 'MCQ' && (!form.option_a || !form.option_b || !form.option_c || !form.option_d)) {
      alert('Please fill in all four options for MCQ.');
      return;
    }
    if (!form.correct_answer.trim()) {
      alert('Please enter the correct answer.');
      return;
    }

    const payload: Record<string, unknown> = {
      subject_id: selectedSubjectId,
      question_type: form.question_type,
      difficulty: form.difficulty,
      chapter: form.chapter.trim() || 'General',
      question_text: form.question_text.trim(),
      correct_answer: form.correct_answer.trim(),
      marks: form.marks,
    };

    if (form.question_type === 'MCQ') {
      payload.option_a = form.option_a.trim();
      payload.option_b = form.option_b.trim();
      payload.option_c = form.option_c.trim();
      payload.option_d = form.option_d.trim();
    } else {
      payload.option_a = null;
      payload.option_b = null;
      payload.option_c = null;
      payload.option_d = null;
    }

    const { error } = await supabase.from('questions').insert(payload);
    if (error) {
      alert('Could not add question: ' + error.message);
      return;
    }
    setForm({
      question_type: 'MCQ',
      difficulty: 'Easy',
      chapter: '',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: '',
      marks: 1,
    });
    setShowForm(false);
    loadQuestions();
    window.dispatchEvent(new CustomEvent('db-changed'));
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      alert('Could not delete question.');
      return;
    }
    loadQuestions();
    window.dispatchEvent(new CustomEvent('db-changed'));
  };

  const filtered = questions.filter((q) => {
    const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase()) ||
      q.chapter.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || q.question_type === filterType;
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    return matchSearch && matchType && matchDiff;
  });

  const classLevel = subjects.find((s) => s.id === selectedSubjectId)?.class_level;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Question Bank</h2>
          <p className="text-slate-500 mt-1">Add and manage questions for your subjects</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
          {selectedSubjectId && (
            <>
              <button
                onClick={() => setShowAIModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-teal-300 text-teal-700 font-medium hover:bg-teal-50 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> AI Generate
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subject pills */}
      <div className="flex flex-wrap gap-2">
        {subjects.length === 0 && (
          <p className="text-slate-400 text-sm">No subjects yet. Click "Add Subject" to get started.</p>
        )}
        {subjects.map((s) => (
          <div
            key={s.id}
            className={`group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all ${
              selectedSubjectId === s.id
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-400'
            }`}
            onClick={() => onSelectSubject(s.id)}
          >
            <span>{s.name} · Class {s.class_level}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Question Form */}
      {showForm && selectedSubjectId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 animate-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">New Question</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
              <select
                value={form.question_type}
                onChange={(e) => setForm({ ...form, question_type: e.target.value as QuestionType })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                <option value="MCQ">Multiple Choice</option>
                <option value="Short">Short Answer</option>
                <option value="Long">Long Answer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Marks</label>
              <input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: parseInt(e.target.value) || 1 })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Chapter / Topic</label>
            <input
              type="text"
              value={form.chapter}
              onChange={(e) => setForm({ ...form, chapter: e.target.value })}
              placeholder="e.g. Algebra, Photosynthesis"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Question Text</label>
            <textarea
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              rows={3}
              placeholder="Enter the question..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-y"
            />
          </div>
          {form.question_type === 'MCQ' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((key, i) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Option {String.fromCharCode(65 + i)}</label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {form.question_type === 'MCQ' ? 'Correct Option (A, B, C, or D)' : 'Correct Answer'}
            </label>
            <input
              type="text"
              value={form.correct_answer}
              onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
              placeholder={form.question_type === 'MCQ' ? 'e.g. A' : 'Enter the answer...'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddQuestion}
              className="px-5 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-sm"
            >
              Save Question
            </button>
          </div>
        </div>
      )}

      {/* Filters + Search */}
      {selectedSubjectId && !showForm && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions or chapters..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="Short">Short</option>
              <option value="Long">Long</option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>
      )}

      {/* Questions list */}
      {selectedSubjectId && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No questions found</p>
              <p className="text-slate-400 text-sm mt-1">
                {questions.length === 0 ? 'Add your first question to get started.' : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Showing {filtered.length} of {questions.length} questions
                {classLevel ? ` · Class ${classLevel}` : ''}
              </p>
              {filtered.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.question_type === 'MCQ' ? 'bg-blue-50 text-blue-700' :
                          q.question_type === 'Short' ? 'bg-amber-50 text-amber-700' :
                          'bg-purple-50 text-purple-700'
                        }`}>
                          {q.question_type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.difficulty === 'Easy' ? 'bg-green-50 text-green-700' :
                          q.difficulty === 'Medium' ? 'bg-orange-50 text-orange-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {q.marks} mark{q.marks > 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-slate-400">· {q.chapter}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{q.question_text}</p>
                      {q.question_type === 'MCQ' && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-slate-600">
                          <span className={q.correct_answer.toUpperCase() === 'A' ? 'font-bold text-teal-700' : ''}>A. {q.option_a}</span>
                          <span className={q.correct_answer.toUpperCase() === 'B' ? 'font-bold text-teal-700' : ''}>B. {q.option_b}</span>
                          <span className={q.correct_answer.toUpperCase() === 'C' ? 'font-bold text-teal-700' : ''}>C. {q.option_c}</span>
                          <span className={q.correct_answer.toUpperCase() === 'D' ? 'font-bold text-teal-700' : ''}>D. {q.option_d}</span>
                        </div>
                      )}
                      {q.question_type !== 'MCQ' && (
                        <p className="mt-2 text-sm text-teal-700 font-medium">Answer: {q.correct_answer}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {!selectedSubjectId && subjects.length > 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium text-lg">Select a subject to view its questions</p>
          <p className="text-slate-400 text-sm mt-1">Click on any subject pill above</p>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSubjectModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Add Subject</h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Subject Name</label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Mathematics"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Class</label>
              <select
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                <option value="">Select class...</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubject}
                className="px-5 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
              >
                Add Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIModal && selectedSubjectId && (
        <AIGenerateModal
          subject={subjects.find((s) => s.id === selectedSubjectId)!}
          onClose={() => setShowAIModal(false)}
          onGenerated={loadQuestions}
        />
      )}
    </div>
  );
}
