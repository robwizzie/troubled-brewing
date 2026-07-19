import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/immersive-gallery.css';

// React Router must know the deploy subpath so links resolve under it.
// Vite sets import.meta.env.BASE_URL from `base` (e.g. "/troubled-brewing/").
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

const isCanvas = new URLSearchParams(window.location.search).has('canvas');

if (isCanvas && window.self === window.top) {
  // ?canvas=1 outside the editor iframe (a stray shared link) — just show the site.
  window.location.replace(import.meta.env.BASE_URL);
} else if (isCanvas) {
  // Editor canvas: boot the page as its own document inside the editor's
  // iframe (lazy so the canvas chunk never loads on the public path).
  import('./canvas/CanvasApp.jsx').then(({ default: CanvasApp }) => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <CanvasApp />
      </React.StrictMode>
    );
  });
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
