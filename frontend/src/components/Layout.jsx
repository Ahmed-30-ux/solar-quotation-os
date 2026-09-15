import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './icons';

const navigation = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/leads', label: 'Leads', icon: 'users' },
  { to: '/quotations', label: 'Quotations', icon: 'fileText' },
  { to: '/products', label: 'Products & Prices', icon: 'package' },
  { to: '/settings', label: 'Settings', icon: 'settings', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 bg-ink-900 text-slate-300 flex flex-col border-r border-slate-800">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Icon name="sun" size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-white text-[15px] tracking-tight leading-tight">
              Solar Quotation OS
            </p>
            <p className="text-[11px] text-slate-400 capitalize">Sell. Quote. Win.</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Workspace
          </p>
          {navigation
            .filter((n) => !n.adminOnly || user?.role === 'admin')
            .map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`icon-tile w-8 h-8 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-white/5 text-slate-500 group-hover:text-slate-300'
                      }`}
                    >
                      <Icon name={n.icon} size={17} strokeWidth={1.9} />
                    </span>
                    {n.label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </>
                )}
              </NavLink>
            ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
              title="Logout"
            >
              <Icon name="logOut" size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}