import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useTicketStore } from '@/stores/ticketStore';
import { checkHealth } from '@/services/ticketService';
import { Ticket, AlertTriangle, Clock, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import './DashboardPage.css';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { stats, statsLoading, fetchStats, tickets, fetchTickets } = useTicketStore();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Check health and load data on mount
  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    fetchStats();
    fetchTickets({ limit: 5 });
  }, []);

  const totalCount = stats?.total ?? 0;
  const criticalCount = stats?.byUrgency?.critical ?? 0;
  const pendingCount = stats?.byStatus?.pending ?? 0;
  const resolvedCount = stats?.byStatus?.resolved ?? 0;

  const statCards = [
    { key: 'total', icon: Ticket, value: totalCount, label: t('dashboard.totalTickets'), variant: 'total' },
    { key: 'critical', icon: AlertTriangle, value: criticalCount, label: t('dashboard.criticalTickets'), variant: 'critical' },
    { key: 'pending', icon: Clock, value: pendingCount, label: t('dashboard.pendingTickets'), variant: 'pending' },
    { key: 'resolved', icon: CheckCircle, value: resolvedCount, label: t('dashboard.resolvedTickets'), variant: 'resolved' },
  ];

  const departmentData = stats?.byDepartment
    ? Object.entries(stats.byDepartment).map(([key, count]) => ({
        key,
        count: count as number,
        total: totalCount || 1,
      }))
    : [];

  const urgencyData = stats?.byUrgency
    ? Object.entries(stats.byUrgency).map(([key, count]) => ({
        key,
        count: count as number,
        total: totalCount || 1,
      }))
    : [];

  return (
    <div className="dashboard">
      {/* Connection Status */}
      <div className={`dashboard__status ${backendOnline === true ? 'dashboard__status--online' : backendOnline === false ? 'dashboard__status--offline' : ''}`}>
        {backendOnline === null ? (
          <><Clock size={14} /> {t('dashboard.loading')}</>
        ) : backendOnline ? (
          <><Wifi size={14} /> {t('dashboard.connected')}</>
        ) : (
          <><WifiOff size={14} /> {t('dashboard.disconnected')}</>
        )}
      </div>

      {/* Greeting */}
      <h2 className="dashboard__greeting">
        {t('dashboard.welcome', { name: '' })} <span>{user?.name || 'User'}</span> 👋
      </h2>

      {/* Stat Cards */}
      <div className="dashboard__stats">
        {statCards.map(({ key, icon: Icon, value, label, variant }) => (
          <div className="statCard" key={key}>
            <div className="statCard__header">
              <div className={`statCard__icon statCard__icon--${variant}`}>
                <Icon size={20} />
              </div>
            </div>
            <div className="statCard__value">
              {statsLoading ? '—' : value}
            </div>
            <div className="statCard__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="dashboard__charts">
        {/* By Department */}
        <div className="chartCard">
          <h3 className="chartCard__title">{t('dashboard.byDepartment')}</h3>
          <div className="chartCard__bar">
            {departmentData.length > 0 ? (
              departmentData.map(({ key, count, total }) => (
                <div className="barItem" key={key}>
                  <span className="barItem__label">{t(`departments.${key}`)}</span>
                  <div className="barItem__track">
                    <div
                      className={`barItem__fill barItem__fill--${key}`}
                      style={{ width: `${(count / total) * 100}%` }}
                    >
                      {Math.round((count / total) * 100)}%
                    </div>
                  </div>
                  <span className="barItem__count">{count}</span>
                </div>
              ))
            ) : (
              <p className="chartCard__empty">{t('dashboard.noData')}</p>
            )}
          </div>
        </div>

        {/* By Urgency */}
        <div className="chartCard">
          <h3 className="chartCard__title">{t('dashboard.byUrgency')}</h3>
          <div className="chartCard__bar">
            {urgencyData.length > 0 ? (
              urgencyData.map(({ key, count, total }) => (
                <div className="barItem" key={key}>
                  <span className="barItem__label">{t(`urgencyLevels.${key}`)}</span>
                  <div className="barItem__track">
                    <div
                      className={`barItem__fill barItem__fill--${key}`}
                      style={{ width: `${(count / total) * 100}%` }}
                    >
                      {Math.round((count / total) * 100)}%
                    </div>
                  </div>
                  <span className="barItem__count">{count}</span>
                </div>
              ))
            ) : (
              <p className="chartCard__empty">{t('dashboard.noData')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="chartCard">
        <h3 className="chartCard__title">{t('dashboard.recentTickets')}</h3>
        {tickets.length > 0 ? (
          <div className="dashboard__recent">
            {tickets.slice(0, 5).map((ticket) => (
              <div className="dashboard__recentItem" key={ticket.id}>
                <div className="dashboard__recentInfo">
                  <span className="dashboard__recentSubject">{ticket.subject}</span>
                  <span className="dashboard__recentEmail">{ticket.customer_email}</span>
                </div>
                <span className={`badge badge--${ticket.urgency}`}>
                  {t(`urgencyLevels.${ticket.urgency}`)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="chartCard__empty">{t('dashboard.noData')}</p>
        )}
      </div>
    </div>
  );
}
