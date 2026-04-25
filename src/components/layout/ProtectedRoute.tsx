import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAccessToken, useActiveOrgId } from '@/hooks/use-token-store';

interface ProtectedRouteProps {
  requireOrg?: boolean;
}

export function ProtectedRoute({
  requireOrg = false,
}: ProtectedRouteProps): React.ReactElement {
  const accessToken = useAccessToken();
  const activeOrgId = useActiveOrgId();
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (requireOrg && !activeOrgId) {
    return <Navigate to="/organizations" replace />;
  }
  return <Outlet />;
}
