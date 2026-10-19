import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { LuArrowLeft, LuCircleAlert } from 'react-icons/lu';
import { Icon } from './components/Icon.jsx';
import { publicUrl } from '../lib/config.js';

/* Supabase's sign-in errors, in plain words with what to do next. */
function friendlyLogin(msg) {
  if (/invalid login credentials/i.test(msg)) return 'That email and password don’t match. Check for typos and try again.';
  if (/email not confirmed/i.test(msg)) return 'This email hasn’t been confirmed yet. Open the confirmation email, then try again.';
  if (/fetch|network/i.test(msg)) return 'We couldn’t reach the server. Check your internet connection and try again.';
  return msg;
}

export default function Login() {
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await signIn(email, password);
    setBusy(false);
    if (res.ok) navigate('/admin');
    else setError(res.error || 'Could not sign in.');
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={onSubmit}>
        <div className="login__brand"><span className="admin__mark" aria-hidden="true">TB</span>Trouble Brewing</div>
        <h1>Sign in</h1>
        <p className="field__hint">Sign in to update your website — hours, menu, chalkboard and more.</p>

        {!configured && (
          <p className="login__error" role="alert"><Icon icon={LuCircleAlert} size={16} />Sign-in isn’t set up on this copy of the site yet. Ask your developer to connect it.</p>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="login__error" role="alert"><Icon icon={LuCircleAlert} size={16} />{friendlyLogin(error)}</p>}

        <button className="btn btn--primary btn--block" type="submit" disabled={busy || !configured}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a className="login__back" href={publicUrl()}><Icon icon={LuArrowLeft} size={16} />Back to the website</a>
      </form>
    </div>
  );
}
