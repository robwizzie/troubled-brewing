import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth.jsx';
import { ToastProvider } from './components/ui.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminLayout from './AdminLayout.jsx';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import PageList from './PageList.jsx';
import PageEditor from './PageEditor.jsx';
import MenuManager from './managers/MenuManager.jsx';
import EventsManager from './managers/EventsManager.jsx';
import TestimonialsManager from './managers/TestimonialsManager.jsx';
import GalleryManager from './managers/GalleryManager.jsx';
import TroublemakersManager from './managers/TroublemakersManager.jsx';
import LocalBusinessManager from './managers/LocalBusinessManager.jsx';
import TimelineManager from './managers/TimelineManager.jsx';
import HoursEditor from './managers/HoursEditor.jsx';
import QuickBlocks from './managers/QuickBlocks.jsx';
import GoogleProfileSettings from './managers/GoogleProfileSettings.jsx';
import Inbox from './managers/Inbox.jsx';
import MediaLibrary from './managers/MediaLibrary.jsx';
import HelpCenter from './HelpCenter.jsx';
import './admin.css';

export default function AdminApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="pages" element={<PageList />} />
            <Route path="pages/:slug" element={<PageEditor />} />
            <Route path="menu" element={<MenuManager />} />
            <Route path="events" element={<EventsManager />} />
            <Route path="testimonials" element={<TestimonialsManager />} />
            <Route path="gallery" element={<GalleryManager />} />
            <Route path="troublemakers" element={<TroublemakersManager />} />
            <Route path="neighborhood" element={<LocalBusinessManager />} />
            <Route path="timeline" element={<TimelineManager />} />
            <Route path="hours" element={<HoursEditor />} />
            <Route path="quick-blocks" element={<QuickBlocks />} />
            <Route path="google" element={<GoogleProfileSettings />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="help" element={<HelpCenter />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
