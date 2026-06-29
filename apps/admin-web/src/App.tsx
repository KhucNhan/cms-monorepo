import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { LoginPage }              from '@/pages/auth/LoginPage';
import { DashboardPage }          from '@/pages/dashboard/DashboardPage';
import { ContentManagerPage }     from '@/pages/content-manager/ContentManagerPage';
import { PageEditPage }            from '@/pages/content-manager/PageEditPage';
import { ContentTypeBuilderPage } from '@/pages/content-type-builder/ContentTypeBuilderPage';
import { AppLayout }              from '@/components/layout/AppLayout';
import { AuthProvider }           from '@/context/AuthContext';
import { ProtectedRoute }         from '@/components/ProtectedRoute';

function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  return (
    <AppLayout title="Dashboard">
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-on-surface-variant">
        <span className="material-symbols-outlined text-[64px] text-outline-variant mb-md">{icon}</span>
        <h2 className="text-h2 font-h2 text-on-surface">{title}</h2>
        <p className="text-body-md mt-sm">This page is coming soon.</p>
      </div>
    </AppLayout>
  );
}

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
          { path: '/content-type-builder', element: <ContentTypeBuilderPage /> },
          { path: '/media-library',        element: <PlaceholderPage title="Media Library" icon="perm_media" /> },
          { path: '/settings',             element: <PlaceholderPage title="Settings" icon="settings" /> },
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