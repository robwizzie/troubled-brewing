import { Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading, configured } = useAuth();

  if (!configured) {
    return (
      <div className="admin-gate">
        <h1>Admin isn't connected yet</h1>
        <p>
          The website is live and running from its built-in content, but the editable CMS needs
          Supabase configured first. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then run the SQL in <code>/supabase</code>.
        </p>
        <p className="field__hint">See docs/DEPLOYMENT.md and docs/INTEGRATIONS.md.</p>
        <a className="btn btn--primary" href="/">Back to the site</a>
      </div>
    );
  }

  if (loading) return <div className="admin-gate"><p>Checking your login…</p></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}
