import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth.jsx';
import { ToastProvider } from './components/ui.jsx';
import { UnsavedProvider, EditScreen } from './lib/publishing.jsx';
import { publicUrl } from '../lib/config.js';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminLayout from './AdminLayout.jsx';
import EditorApp from './editor/EditorApp.jsx';
import Login from './Login.jsx';
import AdminHome from './AdminHome.jsx';
import MenuManager from './managers/MenuManager.jsx';
import EventsManager from './managers/EventsManager.jsx';
import TestimonialsManager from './managers/TestimonialsManager.jsx';
import ReviewsManager from './managers/ReviewsManager.jsx';
import GalleryManager from './managers/GalleryManager.jsx';
import TroublemakersManager from './managers/TroublemakersManager.jsx';
import LocalBusinessManager from './managers/LocalBusinessManager.jsx';
import TimelineManager from './managers/TimelineManager.jsx';
import HoursEditor from './managers/HoursEditor.jsx';
import QuickBlocks from './managers/QuickBlocks.jsx';
import PairingsManager from './managers/PairingsManager.jsx';
import ChalkboardManager from './managers/ChalkboardManager.jsx';
import GoogleProfileSettings from './managers/GoogleProfileSettings.jsx';
import Inbox from './managers/Inbox.jsx';
import MediaLibrary from './managers/MediaLibrary.jsx';
import HelpCenter from './HelpCenter.jsx';
import WishList from './managers/WishList.jsx'; // wishes-tricks
import './admin.css';

/* /admin is a task launcher ("Update the chalkboard", "Change hours"…); the
   on-page editor (/admin/editor) is full-bleed, and the sidebar layout covers
   everything else. Every screen's name comes from lib/nav.js.

   Explicit publishing everywhere: every editing screen is an <EditScreen>
   (or, for the editor and the chalkboard, its own PublishScope) with the same
   sticky action bar, and <UnsavedProvider> warns before unpublished changes
   are lost — closing the tab, a sidebar link, switching pages. */
const screen = (el, slug, viewLabel) => (
  <EditScreen viewHref={slug !== undefined ? publicUrl(slug) : undefined} viewLabel={viewLabel}>{el}</EditScreen>
);

export default function AdminApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <UnsavedProvider>
          <Routes>
            <Route path="login" element={<Login />} />
            {/* On-page editor — full-bleed, outside the sidebar layout */}
            <Route path="editor" element={<ProtectedRoute><EditorApp /></ProtectedRoute>} />
            <Route path="editor/:slug" element={<ProtectedRoute><EditorApp /></ProtectedRoute>} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminHome />} />
              <Route path="settings" element={<Navigate to="/admin" replace />} />
              <Route path="menu" element={screen(<MenuManager />, 'menu', 'View the live Menu page ↗')} />
              <Route path="pairings" element={screen(<PairingsManager />, 'menu', 'View the live Menu page ↗')} />
              <Route path="events" element={screen(<EventsManager />, 'events', 'View the live Events page ↗')} />
              <Route path="testimonials" element={screen(<TestimonialsManager />, 'reviews', 'View the live Reviews page ↗')} />
              <Route path="reviews" element={screen(<ReviewsManager />, 'reviews', 'View the live Reviews page ↗')} />
              <Route path="gallery" element={screen(<GalleryManager />, 'gallery-wall', 'View the live Gallery Wall ↗')} />
              <Route path="troublemakers" element={screen(<TroublemakersManager />, 'troublemakers', 'View the live Troublemakers page ↗')} />
              <Route path="neighborhood" element={screen(<LocalBusinessManager />, 'neighborhood', 'View the live Local Love page ↗')} />
              <Route path="timeline" element={screen(<TimelineManager />, 'timeline', 'View the live Timeline ↗')} />
              <Route path="hours" element={screen(<HoursEditor />, 'location', 'View the live Hours page ↗')} />
              <Route path="quick-blocks" element={screen(<QuickBlocks />, 'home', 'View the live site ↗')} />
              <Route path="chalkboard" element={<ChalkboardManager />} />
              <Route path="google" element={screen(<GoogleProfileSettings />, 'reviews', 'View the live Reviews page ↗')} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="wishes" element={<WishList />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="help" element={<HelpCenter />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </UnsavedProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
