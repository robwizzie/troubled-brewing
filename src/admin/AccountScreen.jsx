import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuCircleAlert, LuCircleCheck, LuKeyRound, LuLogOut } from 'react-icons/lu';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { useAuth } from './lib/auth.jsx';
import { useUnsaved, ScreenHead } from './lib/publishing.jsx';
import { Icon } from './components/Icon.jsx';

/* Your account: who you're signed in as, a new password, and Sign out.

   Owners get their account with a temporary password; this is where they
   set their own. The password only ever lives in this form's state and goes
   straight to supabase.auth.updateUser — it is never logged, stored or put in
   an error message. */

export const MIN_PASSWORD = 8;

/** What's wrong with a new password pair, in plain words, or '' if it's fine. */
export function passwordProblem(password, confirm) {
  if (!password) return 'Type a new password.';
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password !== confirm) return 'The two passwords don’t match. Type the same one in both boxes.';
  return '';
}

function friendlyAuthError(error) {
  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('different from the old')) return 'That’s your current password. Choose a new one.';
  if (msg.includes('weak') || msg.includes('should be at least')) return 'That password is too easy to guess. Try a longer one.';
  if (msg.includes('reauth') || msg.includes('session') || msg.includes('jwt')) return 'For safety, sign out and back in, then change your password straight away.';
  if (msg.includes('fetch') || msg.includes('network')) return 'Couldn’t reach the server. Check the internet connection and try again.';
  return 'Couldn’t change the password. Please try again.';
}

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { guard } = useUnsaved();
  const navigate = useNavigate();
  const pwId = useId();
  const confirmId = useId();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, text }

  async function onSubmit(e) {
    e.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setResult({ ok: false, text: problem });
      return;
    }
    if (!isSupabaseConfigured) {
      setResult({ ok: false, text: 'Accounts need the website’s database connected.' });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setResult({ ok: false, text: friendlyAuthError(error) });
      else {
        setPassword('');
        setConfirm('');
        setResult({ ok: true, text: 'Password changed. Use the new one next time you sign in.' });
      }
    } catch (err) {
      setResult({ ok: false, text: friendlyAuthError(err) });
    } finally {
      setBusy(false);
    }
  }

  function handleSignOut() {
    guard(async () => {
      await signOut();
      navigate('/admin/login');
    });
  }

  return (
    <div className="account">
      <ScreenHead title="Your account" help="Change your password, or sign out of the admin on this device." />

      <section className="admin__panel account__card" aria-labelledby="account-who">
        <h2 id="account-who" className="account__h">Signed in as</h2>
        <p className="account__email">{user?.email || 'Not signed in'}</p>
        <button type="button" className="btn btn--ghost" onClick={handleSignOut}>
          <Icon icon={LuLogOut} size={16} />
          Sign out
        </button>
      </section>

      <form className="admin__panel account__card" onSubmit={onSubmit} aria-labelledby="account-pw" noValidate>
        <h2 id="account-pw" className="account__h">Change your password</h2>
        <p className="panel-help">At least {MIN_PASSWORD} characters. You stay signed in here after changing it.</p>
        <div className="field">
          <label htmlFor={pwId}>New password</label>
          <input
            id={pwId}
            type="password"
            autoComplete="new-password"
            value={password}
            minLength={MIN_PASSWORD}
            onChange={(e) => { setPassword(e.target.value); setResult(null); }}
          />
        </div>
        <div className="field">
          <label htmlFor={confirmId}>Type it again</label>
          <input
            id={confirmId}
            type="password"
            autoComplete="new-password"
            value={confirm}
            minLength={MIN_PASSWORD}
            onChange={(e) => { setConfirm(e.target.value); setResult(null); }}
          />
        </div>
        {result && (
          <p className={`account__msg ${result.ok ? 'is-ok' : 'is-error'}`} role={result.ok ? 'status' : 'alert'}>
            <Icon icon={result.ok ? LuCircleCheck : LuCircleAlert} size={18} />
            <span>{result.text}</span>
          </p>
        )}
        <div className="account__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            <Icon icon={LuKeyRound} size={16} />
            {busy ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}
