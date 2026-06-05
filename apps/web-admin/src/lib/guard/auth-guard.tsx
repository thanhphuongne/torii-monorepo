import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/hooks.ts';
import { selectIsAuthenticated, checkAuth, setError, logout, selectAuthUser } from '@/store/slices/auth-slice.ts';
import { store } from '@/store';
import { PageLoading } from '@workspace/ui/components/page-loading';

interface AuthGuardProps {
    children: ReactNode;
}

export const ADMIN_PANEL_ENTRY_PERMISSIONS = [
    "ops.user.view",
    "ops.user.manage",
    "lms.catalog.create",
    "lms.catalog.update",
    "lms.catalog.approve",
    "lms.delivery.create",
    "lms.delivery.update",
    "lms.delivery.approve",
    "lms.delivery.request.create",
    "lms.delivery.request.read",
    "lms.delivery.request.cancel",
    "lms.assessment.create",
    "lms.assessment.update",
    "lms.assessment.grade",
    "lms.commerce.read",
    "lms.commerce.create",
    "lms.commerce.update",
    "lms.commerce.approve",
    "ops.order.manage",
    "ops.coupon.manage",
    "ops.subscription.manage",
    "ops.support.view",
    "ops.support.handle",
    "ops.audit.view",
    "ops.report.view",
    "ops.blog.manage",
    "ops.gamification.manage",
];

/**
 * AuthGuard wraps protected routes and ensures user is authenticated
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const [hasVerified, setHasVerified] = useState(false);

    useEffect(() => {
        const verifySession = async () => {
            if (hasVerified) return;

            try {
                // If already authenticated in state, use that user, else check with server
                let userToVerify = selectAuthUser(store.getState());

                if (!isAuthenticated || !userToVerify) {
                    userToVerify = await dispatch(checkAuth()).unwrap();
                }

                if (userToVerify) {
                    const permissions = (userToVerify.permissions || []) as string[];
                    const userRole = userToVerify.role;

                    const ALLOWED_ROLES = ['admin', 'staff-academic', 'staff-operations', 'lecturer'];
                    const isStaff = typeof userRole === 'string' && ALLOWED_ROLES.includes(userRole);

                    const hasAdminPermission = permissions.some((p) => ADMIN_PANEL_ENTRY_PERMISSIONS.includes(p));
                    const canEnter = isStaff && hasAdminPermission;

                    if (!canEnter) {
                        dispatch(setError('Bạn không có quyền truy cập trang quản trị.'));
                        dispatch(logout());
                        navigate('/login', { replace: true });
                        return;
                    }
                    setHasVerified(true);
                } else {
                    navigate('/login', { replace: true });
                }
            } catch (error) {
                // Not authenticated
                navigate('/login', { replace: true });
            }
        };

        verifySession();
    }, [isAuthenticated, hasVerified, dispatch, navigate]);

    if (!hasVerified) {
        return (
            <PageLoading className="h-screen" />
        );
    }

    return (isAuthenticated && hasVerified) ? <>{children}</> : null;
}
