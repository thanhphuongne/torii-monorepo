import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions.ts';

interface CanProps {
    /** Single permission required */
    permission?: string;
    /** Require ANY of these permissions */
    anyPermission?: string[];
    /** Require ALL of these permissions */
    allPermissions?: string[];
    /** Content to render if user has permission */
    children: ReactNode;
    /** Optional fallback content if user doesn't have permission */
    fallback?: ReactNode;
}

/**
 * Permission-based conditional rendering component
 * 
 * Usage:
 * <Can permission="ops.user.manage">
 *   <CreateUserButton />
 * </Can>
 * 
 * <Can anyPermission={['course.create', 'course.update']}>
 *   <CourseEditor />
 * </Can>
 */
export function Can({ permission, anyPermission, allPermissions, children, fallback = null }: CanProps) {
    const { can, canAny, canAll } = usePermissions();

    let hasAccess = false;

    if (permission) {
        hasAccess = can(permission);
    } else if (anyPermission) {
        hasAccess = canAny(anyPermission);
    } else if (allPermissions) {
        hasAccess = canAll(allPermissions);
    }

    return hasAccess ? <>{children}</> : <>{fallback}</>;
}
