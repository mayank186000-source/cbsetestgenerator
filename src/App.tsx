import { useState, useEffect } from 'react';
import { supabase, type Subject, type Test } from '@/lib/supabase';
import { BookOpen, FileText, GraduationCap, Settings as SettingsIcon } from 'lucide-react';
import QuestionBank from '@/components/QuestionBank';
import TestGenerator from '@/components/TestGenerator';
import TestPreview from '@/components/TestPreview';
import SettingsPanel from '@/components/SettingsPanel';

type Tab = 'bank' | 'generate' | 'preview' | 'settings';

export default function App() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tab, setTab] = useState<Tab>('bank');
  const [previewTest, setPreviewTest] = useState<Test | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('class_level', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.error('Error loading subjects:', error.message);
    }
    setSubjects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSubjects();
  }, [refreshKey]);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener('db-changed', handler);
    return () => window.removeEventListener('db-changed', handler);
  }, []);

  const handleTestGenerated = (test: Test) => {
    setPreviewTest(test);
    setTab('preview');
  };

  const showTabs = tab !== 'preview';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">CBSE Test Generator</h1>
                <p className="text-xs text-slate-500 leading-tight">Create papers from your question bank</p>
              </div>
            </div>
          </div>

          {showTabs && (
            <nav className="flex gap-1 -mb-px">
              <button
                onClick={() => setTab('bank')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'bank' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Question Bank
              </button>
              <button
                onClick={() => setTab('generate')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'generate' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" /> Generate Test
              </button>
              <button
                onClick={() => setTab('settings')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'settings' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <SettingsIcon className="w-4 h-4" /> Settings
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : tab === 'bank' ? (
          <QuestionBank
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSelectSubject={setSelectedSubjectId}
            refreshKey={refreshKey}
          />
        ) : tab === 'generate' ? (
          <TestGenerator
            subjects={subjects}
            onTestGenerated={handleTestGenerated}
            refreshKey={refreshKey}
          />
        ) : tab === 'settings' ? (
          <SettingsPanel />
        ) : previewTest ? (
          <TestPreview
            test={previewTest}
            subjects={subjects}
            onBack={() => setTab('generate')}
          />
        ) : null}
      </main>
    </div>
  );
}
