import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';

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
        <div className="login__brand">Trouble Brewing</div>
        <h1>Owner login</h1>
        <p className="field__hint">Sign in to edit your website.</p>

        {!configured && (
          <p className="login__error">Supabase isn't configured yet — see the deployment docs.</p>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="login__error">{error}</p>}

        <button className="btn btn--primary btn--block" type="submit" disabled={busy || !configured}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a className="login__back" href="/">← Back to the site</a>
      </form>
    </div>
  );
}
