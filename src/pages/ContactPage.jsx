import { useEffect, useRef, useState } from 'react';
import { getPage, getSections } from '../lib/dataService.js';
import { submitForm } from '../lib/dataService.js';
import SectionRenderer from '../components/SectionRenderer.jsx';
import SEO from '../components/SEO.jsx';
import { PageSkeleton } from '../components/Skeleton.jsx';
import { track } from '../lib/analytics.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useSpamGuard() {
  // Honeypot + a minimum fill-time so trivial bots are rejected without a captcha.
  const mountedAt = useRef(Date.now());
  return function check(formData) {
    if (formData.get('company')) return false; // honeypot filled = bot
    if (Date.now() - mountedAt.current < 2000) return false; // too fast = bot
    return true;
  };
}

function Field({ label, name, type = 'text', required, value, onChange, error, as, children, hint, ...rest }) {
  const Tag = as || 'input';
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={name}>
        {label} {required && <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>*</span>}
      </label>
      {as === 'select' ? (
        <select id={name} name={name} value={value} onChange={onChange} required={required} {...rest}>
          {children}
        </select>
      ) : (
        <Tag id={name} name={name} type={type} value={value} onChange={onChange} required={required} {...rest} />
      )}
      {hint && <p className="field__hint">{hint}</p>}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

function ContactForm() {
  const checkSpam = useSpamGuard();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | ok | error

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please tell us your name.';
    if (!EMAIL_RE.test(form.email)) errs.email = 'Please enter a valid email.';
    if (!form.message.trim()) errs.message = 'What would you like to say?';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (!checkSpam(new FormData(e.target))) {
      setState('error');
      return;
    }
    setState('sending');
    const res = await submitForm({ form_type: 'contact', ...form });
    if (res.ok) {
      setState('ok');
      track('form_submit', { form: 'contact' });
      setForm({ name: '', email: '', phone: '', message: '' });
    } else {
      setState('error');
    }
  }

  if (state === 'ok') {
    return <p className="form-success card" role="status" style={{ padding: 'var(--space-5)' }}>Thanks! We got your message and will be in touch soon. ☕</p>;
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 'var(--space-5)' }} noValidate>
      <h3>Send us a message</h3>
      <Field label="Name" name="name" required value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
      <Field label="Email" name="email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
      <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
      <Field label="Message" name="message" as="textarea" rows={5} required value={form.message} onChange={set('message')} error={errors.message} />
      <div aria-hidden="true" className="honeypot"><input type="text" name="company" tabIndex={-1} autoComplete="off" /></div>
      {state === 'error' && <p className="field__error">Something went wrong sending that. Please try again or call us.</p>}
      <button className="btn btn--primary btn--block" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

function CateringForm() {
  const checkSpam = useSpamGuard();
  const [form, setForm] = useState({ name: '', email: '', phone: '', event_type: '', event_date: '', headcount: '', message: '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please tell us your name.';
    if (!EMAIL_RE.test(form.email)) errs.email = 'Please enter a valid email.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!checkSpam(new FormData(e.target))) {
      setState('error');
      return;
    }
    setState('sending');
    const payload = {
      form_type: 'catering',
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message,
      event_type: form.event_type,
      event_date: form.event_date || null,
      headcount: form.headcount ? Number(form.headcount) : null,
    };
    const res = await submitForm(payload);
    if (res.ok) {
      setState('ok');
      track('form_submit', { form: 'catering' });
      setForm({ name: '', email: '', phone: '', event_type: '', event_date: '', headcount: '', message: '' });
    } else {
      setState('error');
    }
  }

  if (state === 'ok') {
    return <p className="form-success card" role="status" style={{ padding: 'var(--space-5)' }}>Thanks for the catering inquiry! We'll reach out to plan the details. 🎉</p>;
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 'var(--space-5)' }} noValidate>
      <h3>Catering & events inquiry</h3>
      <Field label="Name" name="cname" required value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
      <Field label="Email" name="cemail" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
      <Field label="Phone" name="cphone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
      <Field label="Type of event" name="event_type" as="select" value={form.event_type} onChange={set('event_type')}>
        <option value="">Choose one…</option>
        <option>Shower</option>
        <option>Meeting</option>
        <option>Birthday / party</option>
        <option>Office / corporate</option>
        <option>Other</option>
      </Field>
      <div className="form-row">
        <Field label="Event date" name="event_date" type="date" value={form.event_date} onChange={set('event_date')} />
        <Field label="Headcount" name="headcount" type="number" min="1" value={form.headcount} onChange={set('headcount')} />
      </div>
      <Field label="Tell us more" name="cmessage" as="textarea" rows={4} value={form.message} onChange={set('message')} hint="What are you planning? Any food/drink preferences?" />
      <div aria-hidden="true" className="honeypot"><input type="text" name="company" tabIndex={-1} autoComplete="off" /></div>
      {state === 'error' && <p className="field__error">Something went wrong. Please try again or call us.</p>}
      <button className="btn btn--accent btn--block" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  );
}

export default function ContactPage() {
  const [page, setPage] = useState(null);
  const [sections, setSections] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getPage('contact'), getSections('contact')]).then(([p, s]) => {
      if (!alive) return;
      setPage(p);
      setSections(s);
    });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <SEO title={page?.title} description={page?.meta_description} path="/contact" />
      {sections === null ? (
        <PageSkeleton />
      ) : (
        <>
          {sections.map((s) => <SectionRenderer key={s.id} section={s} />)}
          <section className="section">
            <div className="container">
              <div className="grid grid--2" style={{ alignItems: 'start' }}>
                <ContactForm />
                <CateringForm />
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
