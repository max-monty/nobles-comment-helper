import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSections } from '../../hooks/useSections';
import { useSemesters } from '../../hooks/useSemesters';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_QUESTION_PROMPTS } from '../../lib/defaultPrompts';
import { DEFAULT_WORD_COUNT_TARGET } from '../../lib/constants';

export default function PromptEditorPage() {
  const { yearId, sectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sections } = useSections(yearId);
  const { semesters } = useSemesters(yearId);
  const section = sections.find((s) => s.id === sectionId);

  // Find all quarters for this section's semesters
  const sectionSemesters = semesters.filter((s) => section?.semesterIds?.includes(s.id));
  const quarters = sectionSemesters.flatMap((s) => s.quarters || []);

  const [activeQuarter, setActiveQuarter] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [questionPrompts, setQuestionPrompts] = useState([]);
  const [wordCountTarget, setWordCountTarget] = useState(DEFAULT_WORD_COUNT_TARGET);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auto-select first quarter
  useEffect(() => {
    if (quarters.length > 0 && !activeQuarter) {
      setActiveQuarter(quarters[0].toLowerCase());
    }
  }, [quarters, activeQuarter]);

  // Load prompt data for active quarter
  useEffect(() => {
    if (!user || !yearId || !sectionId || !activeQuarter) return;
    setLoading(true);
    setSaved(false);

    const promptPath = `teachers/${user.uid}/schoolYears/${yearId}/sections/${sectionId}/prompts/${activeQuarter}`;
    getDoc(doc(db, promptPath)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSystemPrompt(data.systemPrompt || DEFAULT_SYSTEM_PROMPT);
        setQuestionPrompts(data.questionPrompts?.length > 0 ? data.questionPrompts : DEFAULT_QUESTION_PROMPTS);
        setWordCountTarget(data.wordCountTarget || DEFAULT_WORD_COUNT_TARGET);
      } else {
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        setQuestionPrompts(DEFAULT_QUESTION_PROMPTS);
        setWordCountTarget(DEFAULT_WORD_COUNT_TARGET);
      }
      setLoading(false);
    }).catch(() => {
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setQuestionPrompts(DEFAULT_QUESTION_PROMPTS);
      setLoading(false);
    });
  }, [user, yearId, sectionId, activeQuarter]);

  const savePrompts = async () => {
    if (!user || !activeQuarter) return;
    setSaving(true);
    try {
      const promptPath = `teachers/${user.uid}/schoolYears/${yearId}/sections/${sectionId}/prompts/${activeQuarter}`;
      await setDoc(doc(db, promptPath), {
        systemPrompt,
        questionPrompts,
        wordCountTarget,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving prompts:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setQuestionPrompts(DEFAULT_QUESTION_PROMPTS);
    setWordCountTarget(DEFAULT_WORD_COUNT_TARGET);
  };

  const updatePromptLabel = (index, label) => {
    setQuestionPrompts((prev) => prev.map((p, i) => i === index ? { ...p, label } : p));
  };

  const removePrompt = (index) => {
    setQuestionPrompts((prev) => prev.filter((_, i) => i !== index));
  };

  const addPrompt = () => {
    setQuestionPrompts((prev) => [
      ...prev,
      { key: `custom_${Date.now()}`, label: '' },
    ]);
  };

  const movePrompt = (index, direction) => {
    const newPrompts = [...questionPrompts];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newPrompts.length) return;
    [newPrompts[index], newPrompts[targetIndex]] = [newPrompts[targetIndex], newPrompts[index]];
    setQuestionPrompts(newPrompts);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-slate-400 hover:text-slate-600 mb-1 cursor-pointer"
          >
            &larr; Back
          </button>
          <h1 className="text-xl font-semibold text-slate-900">
            Edit Prompts: {section?.label || 'Section'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">Saved!</span>}
          <button
            onClick={savePrompts}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Quarter tabs */}
      {quarters.length > 1 && (
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
          {quarters.map((q) => (
            <button
              key={q}
              onClick={() => setActiveQuarter(q.toLowerCase())}
              className={`px-4 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                activeQuarter === q.toLowerCase()
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Question Prompts */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Teacher Note Prompts
              </h2>
              <span className="text-xs text-slate-400">Use {'{{name}}'} for the student's name</span>
            </div>

            <div className="space-y-3">
              {questionPrompts.map((prompt, i) => (
                <div key={prompt.key || i} className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 mt-2">
                    <button
                      onClick={() => movePrompt(i, -1)}
                      disabled={i === 0}
                      className="text-[10px] text-slate-300 hover:text-slate-500 disabled:opacity-30 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => movePrompt(i, 1)}
                      disabled={i === questionPrompts.length - 1}
                      className="text-[10px] text-slate-300 hover:text-slate-500 disabled:opacity-30 cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                  <input
                    type="text"
                    value={prompt.label}
                    onChange={(e) => updatePromptLabel(i, e.target.value)}
                    placeholder="Enter a prompt question..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removePrompt(i)}
                    className="text-slate-300 hover:text-red-500 mt-2 cursor-pointer text-lg"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addPrompt}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              + Add Prompt
            </button>
          </div>

          {/* Word Count Target */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">
              Word Count Target
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={wordCountTarget}
                onChange={(e) => setWordCountTarget(parseInt(e.target.value) || 200)}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-sm text-slate-500">words (default: 200)</span>
            </div>
          </div>

          {/* AI System Prompt */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                AI System Prompt
              </h2>
              <button
                onClick={resetToDefaults}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Reset All to Defaults
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed resize-y focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              This prompt instructs the AI how to compose comments from your notes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
