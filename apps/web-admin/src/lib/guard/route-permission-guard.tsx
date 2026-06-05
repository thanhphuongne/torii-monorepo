import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';

interface RoutePermissionGuardProps {
    permission?: string;
    anyPermission?: string[];
    children?: React.ReactNode;
    redirectTo?: string;
}

export function RoutePermissionGuard({ permission, anyPermission, children, redirectTo = '/access-denied' }: RoutePermissionGuardProps) {
    const { can, canAny, role } = usePermissions();
    let hasAccess = true;

    if (role === 'learner') {
        hasAccess = false;
    }

    if (permission && !can(permission)) {
        hasAccess = false;
    }

    if (anyPermission && !canAny(anyPermission)) {
        hasAccess = false;
    }

    if (!hasAccess) {
        return <Navigate to={redirectTo} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
}
