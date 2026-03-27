import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTicketStore } from '@/stores/ticketStore';
import { useToastStore } from '@/stores/toastStore';
import { Send } from 'lucide-react';
import './CreateTicketPage.css';

export function CreateTicketPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createTicket, isLoading } = useTicketStore();
  const { addToast } = useToastStore();

  const [form, setForm] = useState({
    subject: '',
    body: '',
    customer_email: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (form.subject.trim().length < 3) {
      newErrors.subject = t('createTicket.subjectMin');
    } else if (form.subject.trim().length > 200) {
      newErrors.subject = t('createTicket.subjectMax');
    }

    if (form.body.trim().length < 10) {
      newErrors.body = t('createTicket.bodyMin');
    } else if (form.body.trim().length > 10000) {
      newErrors.body = t('createTicket.bodyMax');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.customer_email)) {
      newErrors.customer_email = t('createTicket.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const ticket = await createTicket({
      subject: form.subject.trim(),
      body: form.body.trim(),
      customer_email: form.customer_email.trim().toLowerCase(),
    });

    if (ticket) {
      addToast('success', t('createTicket.success'));
      navigate('/tickets');
    } else {
      addToast('error', t('createTicket.error'));
    }
  };

  return (
    <div className="createTicketPage">
      <form className="createTicket__form" onSubmit={handleSubmit}>
        {/* Subject */}
        <div className="createTicket__field">
          <label className="createTicket__label">{t('createTicket.subject')}</label>
          <input
            className={`createTicket__input ${errors.subject ? 'createTicket__input--error' : ''}`}
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder={t('createTicket.subjectPlaceholder')}
            maxLength={200}
          />
          {errors.subject && <span className="createTicket__error">{errors.subject}</span>}
          <span className="createTicket__charCount">
            {form.subject.length}/200 {t('createTicket.characters')}
          </span>
        </div>

        {/* Body */}
        <div className="createTicket__field">
          <label className="createTicket__label">{t('createTicket.body')}</label>
          <textarea
            className={`createTicket__textarea ${errors.body ? 'createTicket__input--error' : ''}`}
            name="body"
            value={form.body}
            onChange={handleChange}
            placeholder={t('createTicket.bodyPlaceholder')}
            rows={8}
            maxLength={10000}
          />
          {errors.body && <span className="createTicket__error">{errors.body}</span>}
          <span className="createTicket__charCount">
            {form.body.length}/10,000 {t('createTicket.characters')}
          </span>
        </div>

        {/* Customer Email */}
        <div className="createTicket__field">
          <label className="createTicket__label">{t('createTicket.customerEmail')}</label>
          <input
            className={`createTicket__input ${errors.customer_email ? 'createTicket__input--error' : ''}`}
            type="email"
            name="customer_email"
            value={form.customer_email}
            onChange={handleChange}
            placeholder={t('createTicket.customerEmailPlaceholder')}
          />
          {errors.customer_email && <span className="createTicket__error">{errors.customer_email}</span>}
        </div>

        {/* Submit */}
        <button className="createTicket__submit" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>{t('createTicket.submitting')}</>
          ) : (
            <>
              <Send size={16} />
              {t('createTicket.submit')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
