import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudents } from '../../hooks/useStudents';
import { useSections } from '../../hooks/useSections';
import { useQuarterData } from '../../hooks/useQuarterData';
import StudentListSidebar from './StudentListSidebar';
import NotesForm from './NotesForm';
import CommentEditor from './CommentEditor';
import PastComments from './PastComments';

export default function CommentWriterPage() {
  const { yearId, sectionId, quarter } = useParams();
  const navigate = useNavigate();
  const { students, loading: studentsLoading } = useStudents(yearId, sectionId);
  const { sections } = useSections(yearId);
  const section = sections.find((s) => s.id === sectionId);

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Auto-select first student
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  // Navigate to next unfinished student
  const goNextUnfinished = (allStatuses) => {
    const currentIdx = students.findIndex((s) => s.id === selectedStudentId);
    for (let i = 1; i <= students.length; i++) {
      const idx = (currentIdx + i) % students.length;
      const s = students[idx];
      if (allStatuses[s.id] !== 'finalized') {
        setSelectedStudentId(s.id);
        return;
      }
    }
  };

  if (studentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center px-4">
        <p className="text-slate-400 text-sm mb-4">No students in this section yet.</p>
        <button
          onClick={() => navigate('/setup')}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Add Students
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <StudentListSidebar
        students={students}
        yearId={yearId}
        sectionId={sectionId}
        quarter={quarter}
        selectedStudentId={selectedStudentId}
        onSelectStudent={setSelectedStudentId}
        sectionLabel={section?.label}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {selectedStudent ? (
          <StudentPanel
            key={selectedStudentId}
            student={selectedStudent}
            yearId={yearId}
            sectionId={sectionId}
            quarter={quarter}
            onNextStudent={goNextUnfinished}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Select a student from the sidebar.
          </div>
        )}
      </div>
    </div>
  );
}

function StudentPanel({ student, yearId, sectionId, quarter, onNextStudent }) {
  const {
    data,
    loading,
    saveState,
    updateNotes,
    updateSnapshot,
    setComment,
    updateEditedComment,
    finalize,
    unfinalize,
  } = useQuarterData(yearId, sectionId, student.id, quarter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{student.name}</h2>
          {data.status === 'finalized' && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-0.5 rounded">
              Finalized
            </span>
          )}
          {data.status === 'in-progress' && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              Draft
            </span>
          )}
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {/* Past Comments */}
      <PastComments
        yearId={yearId}
        sectionId={sectionId}
        studentId={student.id}
        currentQuarter={quarter}
      />

      {/* Quarter + Snapshot */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
          {quarter?.toUpperCase()} Grade Snapshot
        </label>
        <input
          type="text"
          value={data.snapshot || ''}
          onChange={(e) => updateSnapshot(e.target.value)}
          placeholder="e.g. Quizzes: 4, 4, 4. Q3 grade: A (3.99)"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-300"
        />
      </div>

      {/* Notes */}
      <NotesForm
        studentName={student.name}
        notes={data.notes || {}}
        onUpdateNote={updateNotes}
        yearId={yearId}
        sectionId={sectionId}
        quarter={quarter}
      />

      <div className="h-px bg-slate-200 my-6" />

      {/* Comment Editor */}
      <CommentEditor
        data={data}
        studentName={student.name}
        sectionId={sectionId}
        yearId={yearId}
        quarter={quarter}
        onSetComment={setComment}
        onUpdateEditedComment={updateEditedComment}
        onFinalize={finalize}
        onUnfinalize={unfinalize}
        onNextStudent={onNextStudent}
      />
    </div>
  );
}

function SaveIndicator({ state }) {
  if (state === 'saving') {
    return <span className="text-xs text-slate-400 flex items-center gap-1.5">
      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
      Saving...
    </span>;
  }
  if (state === 'error') {
    return <span className="text-xs text-red-500">Save failed</span>;
  }
  return <span className="text-xs text-slate-300">Saved</span>;
}
