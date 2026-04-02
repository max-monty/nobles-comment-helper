import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TopNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/setup', label: 'Setup' },
    { path: '/history', label: 'History' },
    { path: '/settings', label: 'Settings' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-8">
        <button
          onClick={() => navigate('/')}
          className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
        >
          Comment Helper
        </button>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user?.isAnonymous ? (
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-500">
            G
          </div>
        ) : user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="w-7 h-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
            {user?.displayName?.[0] || '?'}
          </div>
        )}
        <span className="text-sm text-slate-600 hidden sm:block">
          {user?.isAnonymous ? 'Guest' : user?.displayName?.split(' ')[0]}
        </span>
        <button
          onClick={signOut}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors ml-2 cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
