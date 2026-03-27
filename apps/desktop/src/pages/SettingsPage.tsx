import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { checkHealth } from '@/services/ticketService';
import { Wifi, Trash2 } from 'lucide-react';
import './Pages.css';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme, locale, setLocale } = useSettingsStore();
  const { user, logout, apiBaseUrl, apiKey, setApiCredentials, clearApiCredentials } = useAuthStore();
  const { addToast } = useToastStore();

  const [baseUrl, setBaseUrl] = useState(apiBaseUrl);
  const [key, setKey] = useState(apiKey);
  const [testingConnection, setTestingConnection] = useState(false);

  const handleLocaleChange = (newLocale: 'en' | 'es') => {
    setLocale(newLocale);
    i18n.changeLanguage(newLocale);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveConfig = () => {
    setApiCredentials(baseUrl, key);
    addToast('success', t('settings.configSaved'));
  };

  const handleClearCredentials = () => {
    clearApiCredentials();
    setKey('');
    addToast('info', t('settings.forgetConfirm'));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await checkHealth();
      addToast('success', t('settings.connectionOk'));
    } catch {
      addToast('error', t('settings.connectionFailed'));
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="settingsPage">
      {/* Appearance Section */}
      <div className="settingsSection">
        <h3 className="settingsSection__title">{t('settings.appearance')}</h3>

        <div className="settingsRow">
          <span className="settingsRow__label">{t('settings.theme')}</span>
          <div className="settingsRow__value">
            <button
              className={`segmentBtn ${theme === 'light' ? 'segmentBtn--active' : ''}`}
              onClick={() => setTheme('light')}
            >
              {t('settings.light')}
            </button>
            <button
              className={`segmentBtn ${theme === 'dark' ? 'segmentBtn--active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              {t('settings.dark')}
            </button>
          </div>
        </div>

        <div className="settingsRow">
          <span className="settingsRow__label">{t('settings.language')}</span>
          <div className="settingsRow__value">
            <button
              className={`segmentBtn ${locale === 'en' ? 'segmentBtn--active' : ''}`}
              onClick={() => handleLocaleChange('en')}
            >
              {t('settings.english')}
            </button>
            <button
              className={`segmentBtn ${locale === 'es' ? 'segmentBtn--active' : ''}`}
              onClick={() => handleLocaleChange('es')}
            >
              {t('settings.spanish')}
            </button>
          </div>
        </div>
      </div>

      {/* API Configuration Section */}
      <div className="settingsSection">
        <h3 className="settingsSection__title">{t('settings.apiConfig')}</h3>

        <div className="settingsRow settingsRow--stacked">
          <span className="settingsRow__label">{t('settings.apiBaseUrl')}</span>
          <input
            className="settings__input"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={t('settings.apiBaseUrlPlaceholder')}
          />
        </div>

        <div className="settingsRow settingsRow--stacked">
          <span className="settingsRow__label">{t('settings.apiKey')}</span>
          <input
            className="settings__input"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t('settings.apiKeyPlaceholder')}
          />
        </div>

        <div className="settingsRow__actions">
          <button className="settings__saveBtn" onClick={handleSaveConfig}>
            {t('settings.saveConfig')}
          </button>
          <button className="settings__testBtn" onClick={handleTestConnection} disabled={testingConnection}>
            <Wifi size={14} />
            {testingConnection ? t('common.loading') : t('settings.testConnection')}
          </button>
          <button className="settings__dangerBtn" onClick={handleClearCredentials}>
            <Trash2 size={14} />
            {t('settings.forgetCredentials')}
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="settingsSection">
        <h3 className="settingsSection__title">{t('settings.profile')}</h3>

        <div className="settingsRow">
          <span className="settingsRow__label">{t('login.email')}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {user?.email || 'N/A'}
          </span>
        </div>

        <div className="settingsRow">
          <span className="settingsRow__label">{t('login.nameLabel')}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {user?.name || 'N/A'}
          </span>
        </div>

        <button className="login__submit" onClick={handleLogout} style={{ background: 'var(--color-critical)', marginTop: '12px' }}>
          {t('settings.signOut')}
        </button>
      </div>

      {/* About Section */}
      <div className="settingsSection">
        <h3 className="settingsSection__title">{t('settings.about')}</h3>
        <div className="settingsRow">
          <span className="settingsRow__label">{t('settings.version')}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>1.0.0</span>
        </div>
      </div>
    </div>
  );
}
