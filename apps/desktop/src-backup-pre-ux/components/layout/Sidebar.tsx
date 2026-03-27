import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Settings,
  LogOut,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/tickets', icon: Ticket, labelKey: 'nav.tickets' },
  { path: '/create-ticket', icon: PlusCircle, labelKey: 'nav.createTicket' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar__header">
        <div className="sidebar__logo">TC</div>
        <div className="sidebar__brand">
          <span className="sidebar__title">{t('app.name')}</span>
          <span className="sidebar__subtitle">{t('app.tagline')}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {navItems.map(({ path, icon: Icon, labelKey }) => (
          <button
            key={path}
            className={`sidebar__item ${
              location.pathname === path ? 'sidebar__item--active' : ''
            }`}
            onClick={() => navigate(path)}
          >
            <Icon className="sidebar__icon" />
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </nav>

      {/* User Footer */}
      <div className="sidebar__footer">
        <div className="sidebar__user" onClick={handleLogout} title={t('settings.signOut')}>
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__userInfo">
            <div className="sidebar__userName">{user?.name || 'User'}</div>
            <div className="sidebar__userEmail">{user?.email || ''}</div>
          </div>
          <LogOut size={16} color="var(--text-tertiary)" />
        </div>
      </div>
    </aside>
  );
}
