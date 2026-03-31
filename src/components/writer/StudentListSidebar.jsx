import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { exportComments } from '../../lib/export';

export default function StudentListSidebar({
  students,
  yearId,
  sectionId,
  quarter,
  selectedStudentId,
  onSelectStudent,
  sectionLabel,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState({});
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Listen to all student quarter statuses
  useEffect(() => {
    if (!user || !students.length) return;

    const unsubscribes = students.map((student) => {
      const path = `teachers/${user.uid}/schoolYears/${yearId}/sections/${sectionId}/students/${student.id}/quarters/${quarter}`;
      return onSnapshot(doc(db, path), (snap) => {
        setStatuses((prev) => ({
          ...prev,
          [student.id]: snap.exists() ? snap.data().status || 'empty' : 'empty',
        }));
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [user, students, yearId, sectionId, quarter]);

  const totalDone = Object.values(statuses).filter((s) => s === 'finalized').length;

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {sectionLabel || 'Section'}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{quarter?.toUpperCase()} Comments</p>
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto px-2">
        {students.map((student) => {
          const status = statuses[student.id] || 'empty';
          const isSelected = selectedStudentId === student.id;

          return (
            <button
              key={student.id}
              onClick={() => onSelectStudent(student.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer mb-0.5 ${
                isSelected
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <StatusDot status={status} />
              <span className="truncate">{student.name}</span>
            </button>
          );
        })}
      </div>

      {/* Progress footer */}
      <div className="px-5 py-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>{totalDone} / {students.length} finalized</span>
          <span>{totalDone === students.length ? 'All done!' : `${students.length - totalDone} left`}</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${students.length ? (totalDone / students.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="w-full px-2 py-1.5 text-xs text-slate-400 border border-slate-600 rounded-md hover:text-slate-200 hover:border-slate-500 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {exporting ? 'Exporting...' : 'Export \u25BE'}
            </button>
            {showExportMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-full bg-slate-800 border border-slate-600 rounded-md overflow-hidden shadow-lg z-10">
                {[
                  { label: 'Markdown', format: 'markdown' },
                  { label: 'Word (.docx)', format: 'docx' },
                  { label: 'PDF', format: 'pdf' },
                ].map(({ label, format }) => (
                  <button
                    key={format}
                    onClick={async () => {
                      setShowExportMenu(false);
                      setExporting(true);
                      try {
                        const count = await exportComments(user.uid, yearId, sectionId, quarter, sectionLabel || 'Section', format);
                        if (count === null) alert('No finalized comments to export.');
                      } catch (e) { console.error('Export error:', e); }
                      setExporting(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/prompts/${yearId}/${sectionId}`)}
            className="flex-1 px-2 py-1.5 text-xs text-slate-400 border border-slate-600 rounded-md hover:text-slate-200 hover:border-slate-500 cursor-pointer transition-colors"
          >
            Edit Prompts
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    empty: 'bg-slate-600',
    'in-progress': 'bg-amber-400',
    finalized: 'bg-green-400',
  };

  return (
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || colors.empty}`} />
  );
}
