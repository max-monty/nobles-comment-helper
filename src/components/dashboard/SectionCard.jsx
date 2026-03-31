import { useNavigate } from 'react-router-dom';

export default function SectionCard({ section, yearId, quarters }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
      <h3 className="text-base font-semibold text-slate-900 mb-3">{section.label}</h3>

      <div className="flex flex-wrap gap-2">
        {quarters.map((q) => (
          <button
            key={q}
            onClick={() => navigate(`/write/${yearId}/${section.id}/${q.toLowerCase()}`)}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
          >
            Write {q} Comments
          </button>
        ))}
      </div>
    </div>
  );
}
