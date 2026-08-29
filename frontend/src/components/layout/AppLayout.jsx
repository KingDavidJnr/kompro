import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import api from '../../lib/api';
import Logo from '../../components/Logo';
import { Modal, Button } from '../../components/ui';
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
  PlugIcon,
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
        { to: '/integrations', label: 'Integrations', Icon: PlugIcon },
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

function NavItem({ item, onClick }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl border-l-2 px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'border-brand-500 bg-white/5 text-white'
            : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <item.Icon className="h-5 w-5 flex-none" />
      {item.label}
    </NavLink>
  );
}

function NavLinks({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavItem key={item.to} item={item} onClick={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function MenuIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signoutOpen, setSignoutOpen] = useState(false);

  useEffect(() => {
    api
      .get('/org/settings')
      .then((res) => setOrg(res.data.data.organization))
      .catch(() => {});
  }, []);

  async function confirmLogout() {
    setSignoutOpen(false);
    setMenuOpen(false);
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
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 flex-none flex-col border-r border-charcoal-800 bg-charcoal-900 md:flex">
        <div className="flex h-16 items-center border-b border-charcoal-800 px-5">
          <Logo />
        </div>
        <NavLinks />
        <div className="border-t border-charcoal-800 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-slate-200">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-charcoal-800 bg-charcoal-900">
            <div className="flex h-16 items-center justify-between border-b border-charcoal-800 px-5">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-none items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
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
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-charcoal-800 text-xs font-semibold text-white">
                  {initials}
                </div>
                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <button
                      onClick={() => setSignoutOpen(true)}
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

      <Modal
        open={signoutOpen}
        onClose={() => setSignoutOpen(false)}
        title="Sign out"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSignoutOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmLogout}>
              Sign out
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Are you sure you want to sign out?</p>
      </Modal>
    </div>
  );
}
