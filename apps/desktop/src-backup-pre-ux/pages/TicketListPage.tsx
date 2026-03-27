import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTicketStore, type Ticket } from '@/stores/ticketStore';
import { Search, ChevronLeft, ChevronRight, X, Inbox } from 'lucide-react';
import './TicketListPage.css';

const urgencyOptions = ['critical', 'high', 'medium', 'low'];
const departmentOptions = ['billing', 'technical', 'sales', 'general'];
const statusOptions = ['pending', 'classified', 'escalated', 'resolved'];

export function TicketListPage() {
  const { t } = useTranslation();
  const {
    tickets, isLoading, error, total, offset, limit,
    filters, setFilters, clearFilters, fetchTickets, setSelectedTicket, selectedTicket,
  } = useTicketStore();

  const [searchInput, setSearchInput] = useState(filters.search);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchTickets();
  }, [filters.urgency, filters.department, filters.status, offset]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handlePageChange = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'next' ? offset + limit : Math.max(0, offset - limit);
    useTicketStore.setState({ offset: newOffset });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="ticketListPage">
      {/* Filters Bar */}
      <div className="ticketList__filters">
        <div className="ticketList__searchBox">
          <Search size={16} className="ticketList__searchIcon" />
          <input
            className="ticketList__searchInput"
            placeholder={t('tickets.search')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          className="ticketList__select"
          value={filters.urgency}
          onChange={(e) => setFilters({ urgency: e.target.value })}
        >
          <option value="">{t('tickets.allUrgencies')}</option>
          {urgencyOptions.map((u) => (
            <option key={u} value={u}>{t(`urgencyLevels.${u}`)}</option>
          ))}
        </select>

        <select
          className="ticketList__select"
          value={filters.department}
          onChange={(e) => setFilters({ department: e.target.value })}
        >
          <option value="">{t('tickets.allDepartments')}</option>
          {departmentOptions.map((d) => (
            <option key={d} value={d}>{t(`departments.${d}`)}</option>
          ))}
        </select>

        <select
          className="ticketList__select"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
        >
          <option value="">{t('tickets.allStatuses')}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{t(`statusLevels.${s}`)}</option>
          ))}
        </select>

        {(filters.urgency || filters.department || filters.status || filters.search) && (
          <button className="ticketList__clearBtn" onClick={clearFilters}>
            <X size={14} /> {t('common.cancel')}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="ticketList__error">
          {error}
          <button onClick={() => fetchTickets()}>{t('common.retry')}</button>
        </div>
      )}

      {/* Table */}
      <div className="ticketList__tableWrapper">
        {isLoading ? (
          <div className="ticketList__loading">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="ticketList__skeleton" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="ticketList__empty">
            <Inbox size={48} />
            <h3>{t('tickets.noTickets')}</h3>
            <p>{t('tickets.noTicketsDesc')}</p>
          </div>
        ) : (
          <table className="ticketList__table">
            <thead>
              <tr>
                <th>{t('tickets.subject')}</th>
                <th>{t('tickets.customer')}</th>
                <th>{t('tickets.urgency')}</th>
                <th>{t('tickets.department')}</th>
                <th>{t('tickets.status')}</th>
                <th>{t('tickets.date')}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`ticketList__row ${selectedTicket?.id === ticket.id ? 'ticketList__row--active' : ''}`}
                  onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                >
                  <td className="ticketList__subject">{ticket.subject}</td>
                  <td className="ticketList__email">{ticket.customer_email}</td>
                  <td>
                    <span className={`badge badge--${ticket.urgency}`}>
                      {t(`urgencyLevels.${ticket.urgency}`)}
                    </span>
                  </td>
                  <td>{t(`departments.${ticket.department}`)}</td>
                  <td>
                    <span className={`badge badge--status-${ticket.status}`}>
                      {t(`statusLevels.${ticket.status}`)}
                    </span>
                  </td>
                  <td className="ticketList__date">{formatDate(ticket.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      {selectedTicket && (
        <TicketDetailPanel ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="ticketList__pagination">
          <span className="ticketList__paginationInfo">
            {t('tickets.showing')} {offset + 1}–{Math.min(offset + limit, total)} {t('tickets.of')} {total} {t('tickets.results')}
          </span>
          <div className="ticketList__paginationBtns">
            <button disabled={currentPage <= 1} onClick={() => handlePageChange('prev')}>
              <ChevronLeft size={16} /> {t('tickets.prev')}
            </button>
            <span>{t('tickets.page')} {currentPage} {t('tickets.of')} {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => handlePageChange('next')}>
              {t('tickets.next')} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────────────────

function TicketDetailPanel({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="ticketDetail slide-up">
      <div className="ticketDetail__header">
        <h3>{ticket.subject}</h3>
        <button className="ticketDetail__close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="ticketDetail__meta">
        <span className={`badge badge--${ticket.urgency}`}>
          {t(`urgencyLevels.${ticket.urgency}`)}
        </span>
        <span className={`badge badge--sentiment-${ticket.sentiment}`}>
          {t(`sentimentLevels.${ticket.sentiment}`)}
        </span>
        <span className={`badge badge--status-${ticket.status}`}>
          {t(`statusLevels.${ticket.status}`)}
        </span>
        {ticket.confidence > 0 && (
          <span className="ticketDetail__confidence">
            {t('tickets.confidence')}: {Math.round(ticket.confidence * 100)}%
          </span>
        )}
      </div>

      <div className="ticketDetail__section">
        <label>{t('tickets.customer')}</label>
        <p>{ticket.customer_email}</p>
      </div>

      <div className="ticketDetail__section">
        <label>{t('tickets.body')}</label>
        <p className="ticketDetail__body">{ticket.body}</p>
      </div>

      {ticket.reasoning && (
        <div className="ticketDetail__section">
          <label>{t('tickets.reasoning')}</label>
          <p className="ticketDetail__reasoning">{ticket.reasoning}</p>
        </div>
      )}

      <div className="ticketDetail__section">
        <label>{t('tickets.department')}</label>
        <p>{t(`departments.${ticket.department}`)}</p>
      </div>
    </div>
  );
}
