import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function PastComments({ yearId, sectionId, studentId, currentQuarter }) {
  const { user } = useAuth();
  const [pastComments, setPastComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !user || !yearId || !sectionId || !studentId) return;

    setLoading(true);
    const quartersPath = `teachers/${user.uid}/schoolYears/${yearId}/sections/${sectionId}/students/${studentId}/quarters`;

    getDocs(collection(db, quartersPath)).then((snap) => {
      const comments = [];
      snap.docs.forEach((doc) => {
        if (doc.id === currentQuarter) return; // skip current quarter
        const data = doc.data();
        if (data.editedComment || data.generatedComment) {
          comments.push({
            quarter: doc.id.toUpperCase(),
            comment: data.editedComment || data.generatedComment,
            status: data.status,
            snapshot: data.snapshot,
          });
        }
      });
      // Sort by quarter name
      comments.sort((a, b) => a.quarter.localeCompare(b.quarter));
      setPastComments(comments);
      setLoading(false);
    }).catch(() => {
      setPastComments([]);
      setLoading(false);
    });
  }, [open, user, yearId, sectionId, studentId, currentQuarter]);

  if (!open) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-slate-400 hover:text-blue-600 cursor-pointer flex items-center gap-1.5 py-1.5 px-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          View past comments
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Past Comments This Year
        </h4>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          Close
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : pastComments.length === 0 ? (
        <p className="text-xs text-slate-300 text-center py-3">No past comments for this student.</p>
      ) : (
        <div className="space-y-3">
          {pastComments.map((pc) => (
            <div key={pc.quarter} className="border-l-2 border-slate-200 pl-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-700">{pc.quarter}</span>
                {pc.status === 'finalized' && (
                  <span className="text-[9px] font-semibold uppercase text-green-700 bg-green-100 px-1 py-0.5 rounded">
                    Finalized
                  </span>
                )}
              </div>
              {pc.snapshot && (
                <p className="text-[11px] text-slate-400 mb-1">{pc.snapshot}</p>
              )}
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{pc.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
