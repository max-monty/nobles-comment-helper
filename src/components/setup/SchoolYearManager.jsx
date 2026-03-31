import { useState } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_SEMESTERS } from '../../lib/constants';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function SchoolYearManager({ years, selectedYearId, onSelectYear }) {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const createYear = async () => {
    if (!newLabel.trim() || creating) return;
    setCreating(true);
    try {
      const yearRef = doc(collection(db, 'teachers', user.uid, 'schoolYears'));
      const batch = writeBatch(db);

      // Create school year
      batch.set(yearRef, {
        label: newLabel.trim(),
        isActive: years.length === 0,
        createdAt: serverTimestamp(),
      });

      // Auto-create semesters with quarters
      for (const sem of DEFAULT_SEMESTERS) {
        const semRef = doc(collection(db, 'teachers', user.uid, 'schoolYears', yearRef.id, 'semesters'));
        batch.set(semRef, {
          label: sem.label,
          order: sem.order,
          quarters: sem.quarters,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      onSelectYear(yearRef.id);
      setNewLabel('');
      setShowCreate(false);
    } catch (err) {
      console.error('Error creating school year:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteYear = async (yearId) => {
    try {
      await deleteDoc(doc(db, 'teachers', user.uid, 'schoolYears', yearId));
      if (selectedYearId === yearId) onSelectYear(null);
    } catch (err) {
      console.error('Error deleting school year:', err);
    }
  };

  const setActive = async (yearId) => {
    try {
      // Deactivate all, activate selected
      for (const y of years) {
        await updateDoc(doc(db, 'teachers', user.uid, 'schoolYears', y.id), {
          isActive: y.id === yearId,
        });
      }
    } catch (err) {
      console.error('Error setting active year:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">School Years</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          + Add Year
        </button>
      </div>

      {years.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400 mb-3">No school years yet.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Create Your First Year
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {years.map((year) => (
            <div
              key={year.id}
              onClick={() => onSelectYear(year.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                selectedYearId === year.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{year.label}</span>
                {year.isActive && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!year.isActive && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActive(year.id); }}
                    className="text-[10px] text-slate-400 hover:text-green-600 px-1 cursor-pointer"
                    title="Set as active"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(year); }}
                  className="text-slate-300 hover:text-red-500 text-sm cursor-pointer px-1"
                  title="Delete year"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New School Year">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">School Year</label>
        <select
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
          autoFocus
        >
          <option value="">Select a school year...</option>
          {['2025-2026', '2026-2027']
            .filter((y) => !years.some((existing) => existing.label === y))
            .map((y) => <option key={y} value={y}>{y}</option>)
          }
        </select>
        <p className="text-xs text-slate-400 mt-2 mb-4">
          Two semesters (S1 with Q1/Q2, S2 with Q3/Q4) will be created automatically.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowCreate(false)}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={createYear}
            disabled={!newLabel.trim() || creating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {creating ? 'Creating...' : 'Create Year'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteYear(deleteTarget.id)}
        title="Delete School Year"
        message={`Delete "${deleteTarget?.label}"? This will remove all sections and student data for this year. This cannot be undone.`}
      />
    </div>
  );
}
