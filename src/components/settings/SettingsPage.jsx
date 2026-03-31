import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_SYSTEM_PROMPT } from '../../lib/defaultPrompts';
import { MODELS, DEFAULT_MODEL } from '../../lib/constants';

export default function SettingsPage() {
  const { user } = useAuth();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'teachers', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.defaultSystemPrompt) setSystemPrompt(data.defaultSystemPrompt);
        if (data.defaultModel) setModel(data.defaultModel);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'teachers', user.uid), {
        defaultSystemPrompt: systemPrompt,
        defaultModel: model,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">Settings</h1>
          <p className="text-sm text-slate-500">
            Default preferences for comment generation. Sections can override these.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">Saved!</span>}
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Model Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">
            Default AI Model
          </h2>
          <div className="flex gap-2">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`px-4 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${
                  model === m.id
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Default System Prompt */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Default AI System Prompt
            </h2>
            <button
              onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Reset to Default
            </button>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={16}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed resize-y focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2">
            This is the default prompt used for all sections unless overridden in the section's prompt settings.
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">
            Account
          </h2>
          <div className="text-sm text-slate-600 space-y-1">
            <p><span className="text-slate-400">Email:</span> {user?.email}</p>
            <p><span className="text-slate-400">Name:</span> {user?.displayName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
