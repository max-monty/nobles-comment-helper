import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_QUESTION_PROMPTS, resolvePromptLabel } from '../../lib/defaultPrompts';
import { DEFAULT_MODEL, WORD_COUNT_RANGE } from '../../lib/constants';
import { countWords } from '../../lib/utils';

export default function CommentEditor({
  data,
  studentName,
  sectionId,
  yearId,
  quarter,
  onSetComment,
  onUpdateEditedComment,
  onFinalize,
  onUnfinalize,
  onNextStudent,
}) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setError(null);
    setGenerating(true);

    try {
      // Load custom prompts and system prompt if they exist
      let systemPrompt = DEFAULT_SYSTEM_PROMPT;
      let questionPrompts = DEFAULT_QUESTION_PROMPTS;
      let model = DEFAULT_MODEL;

      // Try to load teacher defaults
      if (user) {
        try {
          const teacherSnap = await getDoc(doc(db, 'teachers', user.uid));
          if (teacherSnap.exists()) {
            const td = teacherSnap.data();
            if (td.defaultSystemPrompt) systemPrompt = td.defaultSystemPrompt;
            if (td.defaultModel) model = td.defaultModel;
          }
        } catch (e) { /* use defaults */ }

        // Try to load section+quarter specific prompts
        try {
          const promptSnap = await getDoc(doc(db, `teachers/${user.uid}/schoolYears/${yearId}/sections/${sectionId}/prompts/${quarter}`));
          if (promptSnap.exists()) {
            const pd = promptSnap.data();
            if (pd.systemPrompt) systemPrompt = pd.systemPrompt;
            if (pd.questionPrompts?.length > 0) questionPrompts = pd.questionPrompts;
          }
        } catch (e) { /* use defaults */ }
      }

      const notes = data.notes || {};
      const noteLines = questionPrompts.map((p) => {
        const label = resolvePromptLabel(p.label, studentName).replace(/\?$/, '');
        const value = notes[p.key]?.trim() || '(not provided)';
        return `- ${label}: ${value}`;
      }).join('\n');

      const userMessage = `Student: ${studentName}
${quarter?.toUpperCase()} Data: ${data.snapshot || '(not provided)'}

Teacher's notes:
${noteLines}`;

      // Call Cloud Function
      const generateComment = httpsCallable(functions, 'generateComment');
      const result = await generateComment({
        systemPrompt,
        userMessage,
        model,
      });

      if (result.data?.text) {
        onSetComment(result.data.text, result.data.text);
      } else {
        setError('No response from API. Please try again.');
      }
    } catch (err) {
      console.error('Generate error:', err);
      // If Cloud Function not deployed yet, show helpful message
      if (err.code === 'functions/not-found' || err.message?.includes('not found')) {
        setError('Cloud Function not deployed yet. Deploy with: firebase deploy --only functions');
      } else {
        setError(err.message || 'Failed to generate comment. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const wc = countWords(data.editedComment || '');
  const wcClass = wc === 0
    ? 'text-slate-400'
    : wc >= WORD_COUNT_RANGE.min && wc <= WORD_COUNT_RANGE.max
    ? 'text-green-600 bg-green-50'
    : 'text-amber-600 bg-amber-50';

  const isFinalized = data.status === 'finalized';

  return (
    <div>
      {/* Generate button */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={generate}
          disabled={generating}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
        >
          {generating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Comment'
          )}
        </button>
        {generating && (
          <span className="text-xs text-slate-400">This may take a few seconds...</span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2 cursor-pointer">&times;</button>
        </div>
      )}

      {/* Comment textarea */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Comment</h3>
          <div className="flex items-center gap-3">
            {(data.editedComment || '').trim() && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(data.editedComment || '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-xs text-slate-400 hover:text-blue-600 cursor-pointer flex items-center gap-1"
                title="Copy comment to clipboard"
              >
                {copied ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
                )}
              </button>
            )}
            {isFinalized && (
              <button
                onClick={onUnfinalize}
                className="text-xs text-slate-400 hover:text-blue-600 underline cursor-pointer"
              >
                Edit again
              </button>
            )}
          </div>
        </div>

        <textarea
          value={data.editedComment || ''}
          onChange={(e) => onUpdateEditedComment(e.target.value)}
          placeholder="Generated comment will appear here. You can also write directly."
          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white placeholder:text-slate-300"
          style={{ minHeight: '240px' }}
        />

        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${wcClass}`}>
            {wc} words
            {wc > 0 && wc < WORD_COUNT_RANGE.min && ' (aim for ~200)'}
            {wc > WORD_COUNT_RANGE.max && ' (a bit long)'}
            {wc >= WORD_COUNT_RANGE.min && wc <= WORD_COUNT_RANGE.max && ' \u2713'}
          </span>

          <div className="flex items-center gap-2">
            {isFinalized && (
              <button
                onClick={() => onNextStudent && onNextStudent({})}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-white cursor-pointer"
              >
                Next Student &rarr;
              </button>
            )}
            <button
              onClick={() => {
                onFinalize();
                // Small delay then advance
                setTimeout(() => onNextStudent && onNextStudent({}), 200);
              }}
              disabled={!data.editedComment?.trim() || isFinalized}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isFinalized ? 'Finalized \u2713' : 'Finalize Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
