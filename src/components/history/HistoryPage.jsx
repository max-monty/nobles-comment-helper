import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { useSections } from '../../hooks/useSections';
import { useSemesters } from '../../hooks/useSemesters';

export default function HistoryPage() {
  const { user } = useAuth();
  const { years, loading: yearsLoading } = useSchoolYears();
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const activeYear = years.find((y) => y.isActive) || years[0];
  const currentYearId = selectedYearId || activeYear?.id;

  const { sections } = useSections(currentYearId);
  const { semesters } = useSemesters(currentYearId);

  // Get quarters for the selected section
  const section = sections.find((s) => s.id === selectedSectionId);
  const sectionSemesters = semesters.filter((s) => section?.semesterIds?.includes(s.id));
  const quarters = sectionSemesters.flatMap((s) => s.quarters || []);

  // Load comments when section + quarter selected
  useEffect(() => {
    if (!user || !currentYearId || !selectedSectionId || !selectedQuarter) {
      setComments([]);
      return;
    }

    setLoadingComments(true);
    const studentsPath = `teachers/${user.uid}/schoolYears/${currentYearId}/sections/${selectedSectionId}/students`;

    getDocs(collection(db, studentsPath)).then(async (studentsSnap) => {
      const results = [];
      for (const studentDoc of studentsSnap.docs) {
        const student = { id: studentDoc.id, ...studentDoc.data() };
        const quarterPath = `${studentsPath}/${studentDoc.id}/quarters/${selectedQuarter}`;
        try {
          const quarterSnap = await getDoc(doc(db, quarterPath));
          if (quarterSnap.exists()) {
            results.push({ student, quarter: quarterSnap.data() });
          }
        } catch (e) { /* skip */ }
      }
      // Sort by student order
      results.sort((a, b) => (a.student.order || 0) - (b.student.order || 0));
      setComments(results);
      setLoadingComments(false);
    }).catch(() => {
      setComments([]);
      setLoadingComments(false);
    });
  }, [user, currentYearId, selectedSectionId, selectedQuarter]);

  if (yearsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (years.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6 text-center">
        <p className="text-slate-400 text-sm">No data yet. Create a school year and write some comments first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">History</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Year selector */}
        <select
          value={currentYearId || ''}
          onChange={(e) => {
            setSelectedYearId(e.target.value);
            setSelectedSectionId(null);
            setSelectedQuarter(null);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </select>

        {/* Section selector */}
        <select
          value={selectedSectionId || ''}
          onChange={(e) => {
            setSelectedSectionId(e.target.value || null);
            setSelectedQuarter(null);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Select section...</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        {/* Quarter selector */}
        {selectedSectionId && quarters.length > 0 && (
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {quarters.map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q.toLowerCase())}
                className={`px-3 py-1 text-sm rounded-md cursor-pointer transition-colors ${
                  selectedQuarter === q.toLowerCase()
                    ? 'bg-white text-slate-900 shadow-sm font-medium'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {!selectedSectionId && (
        <div className="text-center py-12 text-slate-400 text-sm">
          Select a section to view comment history.
        </div>
      )}

      {selectedSectionId && !selectedQuarter && (
        <div className="text-center py-12 text-slate-400 text-sm">
          Select a quarter to view comments.
        </div>
      )}

      {loadingComments && (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {!loadingComments && selectedQuarter && comments.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No comments found for this quarter.
        </div>
      )}

      {!loadingComments && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map(({ student, quarter: qData }) => (
            <div key={student.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{student.name}</h3>
                  {qData.status === 'finalized' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                      Finalized
                    </span>
                  )}
                  {qData.status === 'in-progress' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      Draft
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qData.editedComment || qData.generatedComment || '');
                  }}
                  className="text-xs text-slate-400 hover:text-blue-600 cursor-pointer"
                >
                  Copy
                </button>
              </div>

              {qData.snapshot && (
                <p className="text-xs text-slate-400 mb-2">{qData.snapshot}</p>
              )}

              {(qData.editedComment || qData.generatedComment) ? (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {qData.editedComment || qData.generatedComment}
                </p>
              ) : (
                <p className="text-sm text-slate-300 italic">No comment written yet.</p>
              )}

              {/* Collapsible notes */}
              {qData.notes && Object.values(qData.notes).some((v) => v?.trim()) && (
                <details className="mt-3">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                    View teacher notes
                  </summary>
                  <div className="mt-2 pl-3 border-l-2 border-slate-100 space-y-1">
                    {Object.entries(qData.notes).map(([key, val]) => (
                      val?.trim() && (
                        <p key={key} className="text-xs text-slate-500">
                          <span className="font-medium text-slate-400">{key}:</span> {val}
                        </p>
                      )
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
