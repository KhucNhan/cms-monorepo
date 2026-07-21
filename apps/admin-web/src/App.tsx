import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { GoogleCallbackPage } from '@/pages/auth/GoogleCallbackPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ContentManagementPage } from '@/pages/content-management/ContentManagementPage';
import { PageEditPage } from '@/pages/content-management/PageEditPage';
import { ContentTypeBuilderPage } from '@/pages/block-gallery/ContentTypeBuilderPage';
import { MediaLibraryPage } from '@/pages/media-library/MediaLibraryPage';
import { UsersManagementPage } from '@/pages/users/UsersManagementPage';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RolesPage } from '@/pages/roles/RolesPage';
import { TemplatesPage } from '@/pages/templates/TemplatesPage';
import { AppShell } from '@/components/layout/AppShell';

function AuthProviderWrapper() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AuthProviderWrapper />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/callback', element: <GoogleCallbackPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            // AppShell mounts Sidebar/TopNav exactly ONCE for this whole
            // group — fixes Sidebar remounting (and its template list
            // flickering) on every navigation between these routes.
            element: <AppShell />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/content-management', element: <ContentManagementPage /> },
              { path: '/pages/:pageId/edit', element: <PageEditPage /> },
              { path: '/block-gallery', element: <ContentTypeBuilderPage /> },
              { path: '/media-library', element: <MediaLibraryPage /> },
              { path: '/users', element: <UsersManagementPage /> },
              { path: '/roles', element: <RolesPage /> },
              { path: '/templates', element: <TemplatesPage /> },
            ],
          },
        ],
      },
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;