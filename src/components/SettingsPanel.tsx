import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, Key, Database, Check, Sparkles } from 'lucide-react';

interface ApiSettingsRow {
  id: string;
  provider: string;
  api_key: string;
  settings: {
    custom_supabase_url?: string;
    custom_supabase_key?: string;
    pdf_api_key?: string;
  };
  is_active: boolean;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<ApiSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [pdfApiKey, setPdfApiKey] = useState('');
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState('');
  const [customSupabaseKey, setCustomSupabaseKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('api_settings').select('*').limit(1).maybeSingle();
      if (data) {
        const row = data as unknown as ApiSettingsRow;
        setSettings(row);
        setProvider(row.provider as 'openai' | 'gemini');
        setApiKey(row.api_key || '');
        setPdfApiKey(row.settings?.pdf_api_key || '');
        setCustomSupabaseUrl(row.settings?.custom_supabase_url || '');
        setCustomSupabaseKey(row.settings?.custom_supabase_key || '');
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      provider,
      api_key: apiKey,
      settings: {
        custom_supabase_url: customSupabaseUrl,
        custom_supabase_key: customSupabaseKey,
        pdf_api_key: pdfApiKey,
      },
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (settings) {
      const { error } = await supabase.from('api_settings').update(payload).eq('id', settings.id);
      if (error) {
        alert('Could not save settings: ' + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('api_settings').insert(payload);
      if (error) {
        alert('Could not save settings: ' + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    window.dispatchEvent(new CustomEvent('settings-changed'));
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-500 mt-1">Configure your API keys and connections</p>
      </div>

      <button
        onClick={() => setShowKeys(!showKeys)}
        className="text-sm text-teal-600 font-medium hover:text-teal-700"
      >
        {showKeys ? 'Hide' : 'Show'} saved keys
      </button>

      {/* AI Question Generation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">AI Question Generation</h3>
            <p className="text-sm text-slate-500">Automatically generate CBSE questions using AI</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">AI Provider</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setProvider('openai')}
              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                provider === 'openai'
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              OpenAI (GPT-4o)
            </button>
            <button
              onClick={() => setProvider('gemini')}
              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                provider === 'gemini'
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Google Gemini
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            {provider === 'openai' ? 'OpenAI API Key' : 'Google Gemini API Key'}
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showKeys ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'AIza...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {provider === 'openai'
              ? 'Get your key at platform.openai.com/api-keys'
              : 'Get your key at aistudio.google.com/apikey'}
          </p>
        </div>
      </div>

      {/* Custom Supabase Connection */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Custom Supabase Connection</h3>
            <p className="text-sm text-slate-500">Connect your own Supabase project (optional)</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Supabase Project URL</label>
          <input
            type={showKeys ? 'text' : 'password'}
            value={customSupabaseUrl}
            onChange={(e) => setCustomSupabaseUrl(e.target.value)}
            placeholder="https://yourproject.supabase.co"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Supabase Anon Key</label>
          <input
            type={showKeys ? 'text' : 'password'}
            value={customSupabaseKey}
            onChange={(e) => setCustomSupabaseKey(e.target.value)}
            placeholder="eyJ..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Find these in your Supabase dashboard under Settings &gt; API. Leave blank to use the default project.
          </p>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" /> Saved!
            </>
          ) : (
            <>
              <SettingsIcon className="w-4 h-4" /> Save Settings
            </>
          )}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Settings saved successfully</span>
        )}
      </div>
    </div>
  );
}
