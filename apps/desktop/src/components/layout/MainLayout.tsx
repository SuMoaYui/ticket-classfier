import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ChatWidget } from '../chat/ChatWidget';
import './MainLayout.css';

const pageTitles: Record<string, string> = {
  '/dashboard': 'dashboard.title',
  '/tickets': 'tickets.title',
  '/create-ticket': 'createTicket.title',
  '/settings': 'settings.title',
};

export function MainLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  // Find matching title (also handles /tickets/:id)
  const titleKey =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith('/tickets/') ? 'tickets.detail' : 'app.name');

  return (
    <div className="mainLayout">
      <Sidebar />
      <Topbar title={t(titleKey)} />
      <main className="mainLayout__content fade-in">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
}
