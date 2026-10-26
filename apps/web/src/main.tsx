import './styles/fonts.css';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './app/routes';
import { installContentProtection, protectionEnabled } from './lib/content-protection';

// Right-click and image-drag blocking: on in production builds, off in development (D-037).
if (protectionEnabled(import.meta.env)) installContentProtection(document);

const container = document.getElementById('root');
if (!container) throw new Error('The #root element is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={createBrowserRouter(routes)} />
  </StrictMode>,
);
