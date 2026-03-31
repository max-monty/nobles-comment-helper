import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';

export default function AppShell() {
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
