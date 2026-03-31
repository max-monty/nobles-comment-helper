import { useState } from 'react';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useStudents } from '../../hooks/useStudents';
import { useSections } from '../../hooks/useSections';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function StudentManager({ yearId, sectionId }) {
  const { user } = useAuth();
  const { students, loading } = useStudents(yearId, sectionId);
  const { sections } = useSections(yearId);
  const section = sections.find((s) => s.id === sectionId);

  const [showAdd, setShowAdd] = useState(false);
  const [namesInput, setNamesInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const addStudents = async () => {
    const names = namesInput
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length === 0 || adding) return;
    setAdding(true);
    try {
      const batch = writeBatch(db);
      names.forEach((name, i) => {
        const ref = doc(
          collection(db, 'teachers', user.uid, 'schoolYears', yearId, 'sections', sectionId, 'students')
        );
        batch.set(ref, {
          name,
          order: students.length + i,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setNamesInput('');
      setShowAdd(false);
    } catch (err) {
      console.error('Error adding students:', err);
    } finally {
      setAdding(false);
    }
  };

  const deleteStudent = async (studentId) => {
    try {
      await deleteDoc(
        doc(db, 'teachers', user.uid, 'schoolYears', yearId, 'sections', sectionId, 'students', studentId)
      );
    } catch (err) {
      console.error('Error deleting student:', err);
    }
  };

  const nameCount = namesInput.split('\n').filter((n) => n.trim()).length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Students</h2>
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Students</h2>
          {section && (
            <p className="text-xs text-slate-400 mt-0.5">{section.label}</p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          + Add
        </button>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400 mb-3">No students yet.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Add Students
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-0.5 mb-3">
            {students.map((student, idx) => (
              <div
                key={student.id}
                className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm text-slate-700">
                  <span className="text-xs text-slate-300 mr-2 w-5 inline-block">{idx + 1}.</span>
                  {student.name}
                </span>
                <button
                  onClick={() => setDeleteTarget(student)}
                  className="text-slate-300 hover:text-red-500 text-sm cursor-pointer px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove student"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center">
            {students.length} student{students.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* Unified add modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setNamesInput(''); }} title="Add Students">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Student names (one per line)
        </label>
        <textarea
          value={namesInput}
          onChange={(e) => setNamesInput(e.target.value)}
          placeholder={"Rowan\nRoger\nGrace\nSanaaya"}
          rows={8}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          autoFocus
        />
        {namesInput.trim() && (
          <p className="text-xs text-slate-400 mt-1">
            {nameCount} name{nameCount !== 1 ? 's' : ''} detected
          </p>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => { setShowAdd(false); setNamesInput(''); }}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={addStudents}
            disabled={!namesInput.trim() || adding}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {adding ? 'Adding...' : `Add ${nameCount > 0 ? nameCount : ''} Student${nameCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteStudent(deleteTarget.id)}
        title="Remove Student"
        message={`Remove "${deleteTarget?.name}" from this section? Any comments and notes for this student will be lost.`}
      />
    </div>
  );
}
