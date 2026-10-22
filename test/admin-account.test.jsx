import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/* Your account: the signed-in email, a password change (8+ characters,
   typed twice) through supabase.auth.updateUser, and Sign out. The password
   never reaches the console. */

const sb = vi.hoisted(() => ({ updates: [], error: null, signedOut: 0 }));
vi.mock('../src/lib/supabase.js', () => {
  const user = { id: 'u1', email: 'cat@example.com' };
  const auth = {
    getSession: async () => ({ data: { session: { user } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    updateUser: async (attrs) => { sb.updates.push(attrs); return { data: { user }, error: sb.error }; },
    signOut: async () => { sb.signedOut += 1; return {}; },
  };
  return { isSupabaseConfigured: true, supabase: { auth, from: () => ({}) } };
});

const { AuthProvider } = await import('../src/admin/lib/auth.jsx');
const { UnsavedProvider } = await import('../src/admin/lib/publishing.jsx');
const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const AccountScreen = (await import('../src/admin/AccountScreen.jsx')).default;
const { passwordProblem } = await import('../src/admin/AccountScreen.jsx');

function renderAccount() {
  return render(
    <MemoryRouter initialEntries={['/admin/account']}>
      <AuthProvider>
        <ToastProvider>
          <UnsavedProvider>
            <Routes>
              <Route path="/admin/account" element={<AccountScreen />} />
              <Route path="/admin/login" element={<h1>Sign in page</h1>} />
            </Routes>
          </UnsavedProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}
const fill = (label, v) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });

let logs;
beforeEach(() => {
  sb.updates = [];
  sb.error = null;
  sb.signedOut = 0;
  logs = ['log', 'warn', 'error', 'info'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
});
afterEach(() => {
  const printed = logs.flatMap((s) => s.mock.calls.flat().map(String)).join(' ');
  logs.forEach((s) => s.mockRestore());
  cleanup();
  expect(printed).not.toMatch(/sunny-morning-42|short1/);
});

describe('your account', () => {
  it('shows who is signed in', async () => {
    renderAccount();
    expect(await screen.findByText('cat@example.com')).toBeTruthy();
  });

  it('checks the new password before sending it', () => {
    expect(passwordProblem('', '')).toMatch(/type a new password/i);
    expect(passwordProblem('short1', 'short1')).toMatch(/at least 8/i);
    expect(passwordProblem('sunny-morning-42', 'sunny-morning-43')).toMatch(/don’t match/i);
    expect(passwordProblem('sunny-morning-42', 'sunny-morning-42')).toBe('');
  });

  it('refuses a short password without calling Supabase', async () => {
    renderAccount();
    fill('New password', 'short1');
    fill('Type it again', 'short1');
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 8 characters/i);
    expect(sb.updates).toHaveLength(0);
  });

  it('changes the password with supabase.auth.updateUser and says so', async () => {
    renderAccount();
    fill('New password', 'sunny-morning-42');
    fill('Type it again', 'sunny-morning-42');
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect((await screen.findByRole('status')).textContent).toMatch(/password changed/i);
    expect(sb.updates).toEqual([{ password: 'sunny-morning-42' }]);
    expect(screen.getByLabelText('New password').value).toBe('');
  });

  it('explains a failure in plain words', async () => {
    sb.error = { message: 'New password should be different from the old password.' };
    renderAccount();
    fill('New password', 'sunny-morning-42');
    fill('Type it again', 'sunny-morning-42');
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/that’s your current password/i);
  });

  it('signs out and goes to the sign-in page', async () => {
    renderAccount();
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(await screen.findByText('Sign in page')).toBeTruthy();
    await waitFor(() => expect(sb.signedOut).toBe(1));
  });
});
