import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './icons';

const navigation = [
  { to: '/', label: 'Overview', icon: 'grid', end: true },
  { to: '/leads', label: 'Leads & CRM', icon: 'users' },
  { to: '/quotations', label: 'Quotations', icon: 'fileText' },
  { to: '/configurator', label: 'Solar Configurator', icon: 'sun' },
  { to: '/products', label: 'Products & Inventory', icon: 'package' },
  { to: '/pricing', label: 'Pricing Management', icon: 'dollarSign' },
  { to: '/location', label: 'Location Intelligence', icon: 'map' },
  { to: '/followups', label: 'Follow-ups', icon: 'clock' },
  { to: '/installations', label: 'Installations', icon: 'tool' },
  { to: '/reports', label: 'Reports & Analytics', icon: 'barChart' },
  { to: '/ai-chat', label: 'AI Sales Agent', icon: 'bot' },
  { to: '/settings', label: 'Settings', icon: 'settings', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-navy-950 text-slate-300">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[68px]' : 'w-[240px]'} shrink-0 bg-surface-1 border-r border-surface-4 flex flex-col transition-all duration-200`}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
            <Icon name="sun" size={20} strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-white text-[14px] tracking-tight leading-tight truncate">SolarOS</p>
              <p className="text-[10px] text-slate-500">Solar Quotation Platform</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-surface-3 transition-colors shrink-0"
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Workspace
            </p>
          )}
          {navigation
            .filter((n) => !n.adminOnly || user?.role === 'admin')
            .map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                title={collapsed ? n.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-slate-500 hover:bg-surface-3 hover:text-slate-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`icon-tile w-8 h-8 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-surface-3 text-slate-500 group-hover:text-slate-400'
                      }`}
                    >
                      <Icon name={n.icon} size={16} strokeWidth={1.9} />
                    </span>
                    {!collapsed && (
                      <>
                        {n.label}
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
        </nav>

        {/* User */}
        <div className="px-2 py-3 border-t border-surface-4">
          <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-surface-3 transition-colors"
                  title="Logout"
                >
                  <Icon name="logOut" size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
