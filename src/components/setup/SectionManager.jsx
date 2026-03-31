import { useState } from 'react';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSections } from '../../hooks/useSections';
import { useSemesters } from '../../hooks/useSemesters';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function SectionManager({ yearId, selectedSectionId, onSelectSection }) {
  const { user } = useAuth();
  const { sections, loading } = useSections(yearId);
  const { semesters } = useSemesters(yearId);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newSemesterIds, setNewSemesterIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const createSection = async () => {
    if (!newLabel.trim() || creating) return;
    setCreating(true);
    try {
      const sectionRef = doc(collection(db, 'teachers', user.uid, 'schoolYears', yearId, 'sections'));
      await setDoc(sectionRef, {
        label: newLabel.trim(),
        semesterIds: newSemesterIds.length > 0 ? newSemesterIds : semesters.map((s) => s.id),
        order: sections.length,
        createdAt: serverTimestamp(),
      });
      onSelectSection(sectionRef.id);
      setNewLabel('');
      setNewSemesterIds([]);
      setShowCreate(false);
    } catch (err) {
      console.error('Error creating section:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteSection = async (sectionId) => {
    try {
      await deleteDoc(doc(db, 'teachers', user.uid, 'schoolYears', yearId, 'sections', sectionId));
      if (selectedSectionId === sectionId) onSelectSection(null);
    } catch (err) {
      console.error('Error deleting section:', err);
    }
  };

  const toggleSemester = (semId) => {
    setNewSemesterIds((prev) =>
      prev.includes(semId) ? prev.filter((id) => id !== semId) : [...prev, semId]
    );
  };

  // Build a display label for semester assignment
  const getSemesterLabel = (section) => {
    if (!semesters.length) return '';
    const assigned = semesters.filter((s) => section.semesterIds?.includes(s.id));
    if (assigned.length === semesters.length) return 'Full year';
    return assigned.map((s) => s.label).join(', ') || 'Unassigned';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Sections</h2>
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Sections</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          + Add Section
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400 mb-3">No sections yet.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Add Your First Section
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                selectedSectionId === section.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div>
                <span className="text-sm font-medium text-slate-800 block">{section.label}</span>
                <span className="text-[11px] text-slate-400">{getSemesterLabel(section)}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(section); }}
                className="text-slate-300 hover:text-red-500 text-sm cursor-pointer px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete section"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Section">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Section Name</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. AP CS Section 2"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {semesters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Semesters</label>
              <div className="flex gap-2">
                {semesters.map((sem) => (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() => toggleSemester(sem.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors ${
                      newSemesterIds.includes(sem.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {sem.label} ({sem.quarters?.join(', ')})
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {newSemesterIds.length === 0 ? 'Leave empty for full year.' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowCreate(false)}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={createSection}
            disabled={!newLabel.trim() || creating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {creating ? 'Creating...' : 'Create Section'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteSection(deleteTarget.id)}
        title="Delete Section"
        message={`Delete "${deleteTarget?.label}"? All student data and comments in this section will be lost.`}
      />
    </div>
  );
}
