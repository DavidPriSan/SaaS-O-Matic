import type { RouteObject } from 'react-router';
import { ButtonLink } from '../components/Button';
import { EmptyState, ErrorState } from '../components/StatusViews';
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage';
import { NewCustomerPage } from '../features/customers/NewCustomerPage';
import { SearchPage } from '../features/customers/SearchPage';
import { Layout } from './Layout';

/** Route table shared by the browser router (main.tsx) and memory routers in tests. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: (
      <ErrorState title="Error inesperado" message="La aplicación ha encontrado un error. Recarga la página." />
    ),
    children: [
      { index: true, element: <SearchPage /> },
      { path: 'customers/new', element: <NewCustomerPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      {
        path: '*',
        element: <EmptyState title="Página no encontrada" action={<ButtonLink to="/">Ir al inicio</ButtonLink>} />,
      },
    ],
  },
];
