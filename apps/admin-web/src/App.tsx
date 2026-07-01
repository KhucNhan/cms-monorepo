import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { LoginPage }              from '@/pages/auth/LoginPage';
import { DashboardPage }          from '@/pages/dashboard/DashboardPage';
import { ContentManagerPage }     from '@/pages/content-manager/ContentManagerPage';
import { PageEditPage }            from '@/pages/content-manager/PageEditPage';
import { ContentTypeBuilderPage } from '@/pages/block-gallery/ContentTypeBuilderPage';
import { MediaLibraryPage }     from '@/pages/media-library/MediaLibraryPage';
import { VersionArchivePage }   from '@/pages/version-archive/VersionArchivePage';
import { SettingsPage }         from '@/pages/settings/SettingsPage';
import { AuthProvider }           from '@/context/AuthContext';
import { ProtectedRoute }         from '@/components/ProtectedRoute';

// AuthProviderWrapper ensures AuthProvider runs inside the Router context
// so that useAuth's useNavigate works correctly!
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
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard',            element: <DashboardPage /> },
          { path: '/content-manager',      element: <ContentManagerPage /> },
          { path: '/pages/:pageId/edit',   element: <PageEditPage /> },
          { path: '/block-gallery',        element: <ContentTypeBuilderPage /> },
          { path: '/media-library',        element: <MediaLibraryPage /> },
          { path: '/version-archive',      element: <VersionArchivePage /> },
          { path: '/settings',             element: <SettingsPage /> },
        ],
      },
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;