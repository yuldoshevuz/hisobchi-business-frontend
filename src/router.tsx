import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { OrganizationsPage } from '@/pages/OrganizationsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MembersPage } from '@/pages/MembersPage';
import { RolesPage } from '@/pages/RolesPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { ProfilePage } from '@/pages/ProfilePage';

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
              { path: 'members', element: <MembersPage /> },
              { path: 'roles', element: <RolesPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'clients', element: <ClientsPage /> },
              { path: 'profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
