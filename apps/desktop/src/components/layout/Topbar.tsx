import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { Sun, Moon, Globe } from 'lucide-react';
import './Topbar.css';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme, locale, setLocale } = useSettingsStore();

  const handleLocaleToggle = () => {
    const next = locale === 'es' ? 'en' : 'es';
    setLocale(next);
    i18n.changeLanguage(next);
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <h1 className="topbar__pageTitle">{title}</h1>
      </div>

      <div className="topbar__right">
        {/* Theme Toggle */}
        <button
          className="topbar__btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? t('settings.light') : t('settings.dark')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? t('settings.light') : t('settings.dark')}
        </button>

        <div className="topbar__divider" />

        {/* Locale Toggle */}
        <button
          className="topbar__btn"
          onClick={handleLocaleToggle}
          title={t('settings.language')}
        >
          <Globe size={16} />
          {locale === 'es' ? t('settings.english') : t('settings.spanish')}
        </button>
      </div>
    </header>
  );
}
