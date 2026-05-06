import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { OrganizationsPage } from '@/pages/OrganizationsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { ContactDetailPage } from '@/pages/ContactDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { KatalogPage } from '@/pages/KatalogPage';
import { PlansPage } from '@/pages/PlansPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ScheduledPage } from '@/pages/ScheduledPage';
import { CommissionsPage } from '@/pages/CommissionsPage';
import { SozlamalarPage } from '@/pages/SozlamalarPage';
import { TransactionsListPage } from '@/pages/TransactionsListPage';
import { TransactionDetailPage } from '@/pages/TransactionDetailPage';
import { TransactionCreatePage } from '@/pages/TransactionCreatePage';
import { SalesListPage } from '@/pages/SalesListPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/organizations', element: <OrganizationsPage /> },
      {
        element: <ProtectedRoute requireOrg />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'katalog', element: <KatalogPage /> },
              { path: 'sozlamalar', element: <SozlamalarPage /> },
              { path: 'contacts', element: <ContactsPage /> },
              { path: 'contacts/:id', element: <ContactDetailPage /> },
              { path: 'scheduled', element: <ScheduledPage /> },
              { path: 'commissions', element: <CommissionsPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'plans', element: <PlansPage /> },
              { path: 'transactions', element: <TransactionsListPage /> },
              { path: 'sales', element: <SalesListPage /> },
              {
                path: 'transactions/new/:useCase',
                element: <TransactionCreatePage />,
              },
              {
                path: 'transactions/:id',
                element: <TransactionDetailPage />,
              },
              { path: 'profile', element: <ProfilePage /> },
              // Legacy route redirects so deep links keep working.
              {
                path: 'members',
                element: <Navigate to="/sozlamalar" replace />,
              },
              {
                path: 'roles',
                element: <Navigate to="/sozlamalar?tab=roles" replace />,
              },
              {
                path: 'categories',
                element: <Navigate to="/katalog?tab=categories" replace />,
              },
              {
                path: 'products',
                element: <Navigate to="/katalog" replace />,
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
