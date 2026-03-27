import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useToastStore } from '@/stores/toastStore';
import { Globe, Sun, Moon, AlertCircle } from 'lucide-react';
import './LoginPage.css';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    registerLocal,
    loginLocal,
    loginGoogle,
    isLoading,
    error,
    clearError,
    loadPersistedConfig,
    setApiCredentials,
    apiBaseUrl,
  } = useAuthStore();
  const { theme, toggleTheme, locale, setLocale } = useSettingsStore();
  const { addToast } = useToastStore();
  const [isSignUp, setIsSignUp] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    apiKey: '',
  });

  const [validationError, setValidationError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (validationError) setValidationError('');
    if (error) clearError();
  };

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'EMAIL_EXISTS': return t('login.emailExists');
      case 'INVALID_CREDENTIALS': return t('login.invalidCredentials');
      case 'GOOGLE_LOGIN_FAILED': return t('login.googleFailed');
      case 'OAUTH_TIMEOUT': return t('login.oauthTimeout');
      default: return t('login.connectionFailed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validation
    if (!form.email || !form.password) {
      setValidationError(t('login.invalidCredentials'));
      return;
    }

    if (form.password.length < 6) {
      setValidationError(t('login.passwordTooShort'));
      return;
    }

    if (isSignUp) {
      if (!form.name.trim()) {
        setValidationError(t('login.nameRequired'));
        return;
      }
      if (form.password !== form.confirmPassword) {
        setValidationError(t('login.passwordMismatch'));
        return;
      }
    }

    // Load persisted API config
    await loadPersistedConfig();

    // Save API key if provided
    if (form.apiKey) {
      setApiCredentials(apiBaseUrl, form.apiKey);
    }

    let success: boolean;

    if (isSignUp) {
      success = await registerLocal(form.name, form.email, form.password);
    } else {
      success = await loginLocal(form.email, form.password);
    }

    if (success) {
      addToast('success', isSignUp ? t('login.registrationSuccess') : t('common.success'));
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    await loadPersistedConfig();

    if (form.apiKey) {
      setApiCredentials(apiBaseUrl, form.apiKey);
    }

    const success = await loginGoogle();
    if (success) {
      addToast('success', t('common.success'));
      navigate('/dashboard');
    }
  };

  const handleLocaleToggle = () => {
    const next = locale === 'es' ? 'en' : 'es';
    setLocale(next);
    i18n.changeLanguage(next);
  };

  const displayError = validationError || (error ? getErrorMessage(error) : '');

  return (
    <div className="loginPage">
      {/* Top-right controls */}
      <div className="login__langToggle">
        <button className="topbar__btn" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="topbar__btn" onClick={handleLocaleToggle}>
          <Globe size={16} />
          {locale === 'es' ? 'EN' : 'ES'}
        </button>
      </div>

      <div className="login__card">
        {/* Header */}
        <div className="login__header">
          <div className="login__logo">TC</div>
          <h1 className="login__title">
            {isSignUp ? t('login.signUp') : t('login.title')}
          </h1>
          <p className="login__subtitle">{t('login.subtitle')}</p>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="login__error">
            <AlertCircle size={16} />
            {displayError}
          </div>
        )}

        {/* Form */}
        <form className="login__form" onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="login__field">
              <label className="login__label">{t('login.nameLabel')}</label>
              <input
                className="login__input"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div className="login__field">
            <label className="login__label">{t('login.email')}</label>
            <input
              className="login__input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="user@company.com"
              required
            />
          </div>

          <div className="login__field">
            <label className="login__label">{t('login.password')}</label>
            <input
              className="login__input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div className="login__field">
              <label className="login__label">{t('login.confirmPassword')}</label>
              <input
                className="login__input"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {/* API Key Field */}
          <div className="login__field">
            <label className="login__label">{t('login.apiKey')}</label>
            <input
              className="login__input"
              type="password"
              name="apiKey"
              value={form.apiKey}
              onChange={handleChange}
              placeholder={t('login.apiKeyPlaceholder')}
            />
            <span className="login__hint">{t('login.apiKeyRequired')}</span>
          </div>

          <button className="login__submit" type="submit" disabled={isLoading}>
            {isLoading
              ? isSignUp
                ? t('login.creatingAccount')
                : t('login.signingIn')
              : isSignUp
                ? t('login.signUp')
                : t('login.signIn')}
          </button>
        </form>

        {/* OAuth Divider */}
        <div className="login__divider">
          <div className="login__dividerLine" />
          <span className="login__dividerText">{t('login.orContinueWith')}</span>
          <div className="login__dividerLine" />
        </div>

        {/* OAuth Buttons */}
        <div className="login__oauth">
          <button
            className="login__oauthBtn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg className="login__oauthIcon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('login.google')}
          </button>

          <button className="login__oauthBtn" disabled title="Azure AD pending">
            <svg className="login__oauthIcon" viewBox="0 0 24 24">
              <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z"/>
              <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z"/>
              <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z"/>
              <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z"/>
            </svg>
            {t('login.microsoft')}
          </button>
        </div>

        {/* Toggle sign-in / sign-up */}
        <p className="login__toggle">
          {isSignUp ? t('login.hasAccount') : t('login.noAccount')}
          <span
            className="login__toggleLink"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setValidationError('');
              clearError();
            }}
          >
            {isSignUp ? t('login.signIn') : t('login.signUp')}
          </span>
        </p>
      </div>
    </div>
  );
}
