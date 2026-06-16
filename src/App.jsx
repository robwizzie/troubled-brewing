import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import AnnouncementBanner from './components/AnnouncementBanner.jsx';
import ConsentBanner from './components/ConsentBanner.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useAnalytics } from './lib/analytics.js';

import Home from './pages/Home.jsx';
import SitePage from './pages/SitePage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import AccessibilityPage from './pages/AccessibilityPage.jsx';
import NotFound from './pages/NotFound.jsx';

// Admin is auth-gated and irrelevant to visitors — keep it out of the main bundle.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function PublicShell({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <AnnouncementBanner />
      <Nav />
      <main id="main">{children}</main>
      <Footer />
      <ConsentBanner />
    </>
  );
}

export default function App() {
  useAnalytics(); // tracks page views (after consent) — no-op until consent + GA id

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
        {/* Admin (lazy, no public chrome) */}
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="route-loading">Loading admin…</div>}>
              <AdminApp />
            </Suspense>
          }
        />

        {/* Public site */}
        <Route path="/" element={<PublicShell><Home /></PublicShell>} />
        <Route path="/menu" element={<PublicShell><SitePage slug="menu" /></PublicShell>} />
        <Route path="/about" element={<PublicShell><SitePage slug="about" /></PublicShell>} />
        <Route path="/events" element={<PublicShell><SitePage slug="events" /></PublicShell>} />
        <Route path="/location" element={<PublicShell><SitePage slug="location" /></PublicShell>} />
        <Route path="/contact" element={<PublicShell><ContactPage /></PublicShell>} />
        <Route path="/community" element={<PublicShell><SitePage slug="community" showSocial /></PublicShell>} />
        <Route path="/timeline" element={<PublicShell><SitePage slug="timeline" /></PublicShell>} />
        <Route path="/reviews" element={<PublicShell><SitePage slug="reviews" /></PublicShell>} />
        <Route path="/gallery-wall" element={<PublicShell><SitePage slug="gallery-wall" /></PublicShell>} />
        <Route path="/troublemakers" element={<PublicShell><SitePage slug="troublemakers" /></PublicShell>} />
        <Route path="/neighborhood" element={<PublicShell><SitePage slug="neighborhood" /></PublicShell>} />
        <Route path="/privacy" element={<PublicShell><PrivacyPage /></PublicShell>} />
        <Route path="/accessibility" element={<PublicShell><AccessibilityPage /></PublicShell>} />
        <Route path="*" element={<PublicShell><NotFound /></PublicShell>} />
      </Routes>
    </ErrorBoundary>
  );
}
