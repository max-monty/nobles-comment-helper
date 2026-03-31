import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_QUESTION_PROMPTS, resolvePromptLabel } from '../../lib/defaultPrompts';
import AutoTextarea from '../ui/AutoTextarea';

export default function NotesForm({ studentName, notes, onUpdateNote, yearId, sectionId, quarter }) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState(DEFAULT_QUESTION_PROMPTS);

  // Load custom prompts if they exist for this section+quarter
  useEffect(() => {
    if (!user || !yearId || !sectionId || !quarter) return;

    const promptDocPath = `teachers/${user.uid}/schoolYears/${yearId}/sections/${sectionId}/prompts/${quarter}`;
    getDoc(doc(db, promptDocPath)).then((snap) => {
      if (snap.exists() && snap.data().questionPrompts?.length > 0) {
        setPrompts(snap.data().questionPrompts);
      }
    }).catch(() => {});
  }, [user, yearId, sectionId, quarter]);

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
        Teacher Notes
      </h3>
      <div className="space-y-4">
        {prompts.map((prompt, i) => (
          <div key={prompt.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 leading-snug">
              {resolvePromptLabel(prompt.label, studentName)}
            </label>
            <AutoTextarea
              value={notes[prompt.key] || ''}
              onChange={(val) => onUpdateNote(prompt.key, val)}
              placeholder="Type your notes here..."
              style={{ minHeight: '44px' }}
              tabIndex={i + 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
