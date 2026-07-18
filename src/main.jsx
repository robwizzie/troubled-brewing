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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
