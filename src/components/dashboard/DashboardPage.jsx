import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { useSections } from '../../hooks/useSections';
import { useSemesters } from '../../hooks/useSemesters';
import SectionCard from './SectionCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { years, loading } = useSchoolYears();

  // Find active year
  const activeYear = years.find((y) => y.isActive) || years[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!years || years.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center px-4">
        <div className="text-5xl mb-4">&#x1F393;</div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Welcome, {user?.displayName?.split(' ')[0]}!
        </h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Get started by setting up your school year, sections, and students.
          You'll be writing comments in no time.
        </p>
        <button
          onClick={() => navigate('/setup')}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Set Up Your Classes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">{activeYear.label}</p>
        </div>
        <button
          onClick={() => navigate('/setup')}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Manage Classes
        </button>
      </div>

      <DashboardContent yearId={activeYear.id} />
    </div>
  );
}

function DashboardContent({ yearId }) {
  const navigate = useNavigate();
  const { sections, loading: sectionsLoading } = useSections(yearId);
  const { semesters } = useSemesters(yearId);

  if (sectionsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        <p>No sections yet. Add your class sections to get started.</p>
        <button
          onClick={() => navigate('/setup')}
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
        >
          Go to Setup
        </button>
      </div>
    );
  }

  // Group sections by semester
  const semesterGroups = semesters.map((sem) => ({
    semester: sem,
    sections: sections.filter((s) => s.semesterIds?.includes(sem.id)),
  }));

  // Find quarters from semesters
  const allQuarters = semesters.flatMap((s) => s.quarters || []);

  return (
    <div className="space-y-8">
      {semesterGroups.map(({ semester, sections: semSections }) => (
        semSections.length > 0 && (
          <div key={semester.id}>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {semester.label} ({semester.quarters?.join(', ')})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {semSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  yearId={yearId}
                  quarters={semester.quarters || []}
                />
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}
