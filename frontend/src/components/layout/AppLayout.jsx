import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import api from '../../lib/api';
import Logo from '../../components/Logo';
import {
  ChartIcon,
  ShieldIcon,
  CubeIcon,
  DocumentIcon,
  FolderIcon,
  ClipboardIcon,
  FlagIcon,
  UsersIcon,
  KeyIcon,
  ServerIcon,
  LogoutIcon,
  BellIcon,
  ChevronDownIcon,
} from '../../components/icons';

const NAV = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', Icon: ChartIcon, end: true }],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/frameworks', label: 'Frameworks', Icon: ShieldIcon },
      { to: '/controls', label: 'Controls', Icon: CubeIcon },
      { to: '/policies', label: 'Policies', Icon: DocumentIcon },
      { to: '/evidence', label: 'Evidence', Icon: FolderIcon },
      { to: '/assessments', label: 'Assessments', Icon: ClipboardIcon },
    ],
  },
  {
    label: 'GRC',
    items: [
      { to: '/risk', label: 'Risk', Icon: FlagIcon },
      { to: '/incidents', label: 'Incidents', Icon: ExclamationNav },
      { to: '/itsm', label: 'ITSM', Icon: ServerIcon },
      { to: '/audit-program', label: 'Audit Program', Icon: ClipboardIcon },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/organization', label: 'Organization', Icon: UsersIcon },
      { to: '/users', label: 'Users', Icon: UsersIcon },
      { to: '/roles', label: 'Roles', Icon: KeyIcon },
    ],
  },
];

// Local placeholder to avoid importing an icon name that collides.
function ExclamationNav(props) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.4 17a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    </svg>
  );
}

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <item.Icon className="h-5 w-5 flex-none" />
      {item.label}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api
      .get('/org/settings')
      .then((res) => setOrg(res.data.data.organization))
      .catch(() => {});
  }, []);

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-none flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.to} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-none items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{org?.displayName || org?.name || 'My Organization'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <BellIcon className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-2 hover:bg-slate-50"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {initials}
                </div>
                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <button
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <LogoutIcon className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
