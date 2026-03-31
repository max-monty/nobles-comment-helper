import { useState } from 'react';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import SchoolYearManager from './SchoolYearManager';
import SectionManager from './SectionManager';
import StudentManager from './StudentManager';

export default function SetupPage() {
  const { years, loading } = useSchoolYears();
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  // Auto-select active year
  const activeYear = years.find((y) => y.isActive) || years[0];
  const currentYearId = selectedYearId || activeYear?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Setup</h1>
        <p className="text-sm text-slate-500">
          Manage your school years, class sections, and student rosters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: School Years */}
        <div>
          <SchoolYearManager
            years={years}
            selectedYearId={currentYearId}
            onSelectYear={(id) => {
              setSelectedYearId(id);
              setSelectedSectionId(null);
            }}
          />
        </div>

        {/* Column 2: Sections */}
        <div>
          {currentYearId ? (
            <SectionManager
              yearId={currentYearId}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
            />
          ) : (
            <EmptyColumn
              title="Sections"
              message="Create a school year first, then add your class sections."
            />
          )}
        </div>

        {/* Column 3: Students */}
        <div>
          {currentYearId && selectedSectionId ? (
            <StudentManager
              yearId={currentYearId}
              sectionId={selectedSectionId}
            />
          ) : (
            <EmptyColumn
              title="Students"
              message={currentYearId ? 'Select a section to manage its students.' : 'Create a school year and section first.'}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyColumn({ title, message }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">{title}</h2>
      <p className="text-sm text-slate-400 text-center py-8">{message}</p>
    </div>
  );
}
