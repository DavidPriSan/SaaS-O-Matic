import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { createQueryClient } from './api/queryClient';
import { routes } from './app/routes';
import { CurrencyProvider } from './features/currency/CurrencyContext';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');

const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <RouterProvider router={router} />
      </CurrencyProvider>
    </QueryClientProvider>
  </StrictMode>,
);
