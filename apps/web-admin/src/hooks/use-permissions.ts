import { useAppSelector } from '@/hooks/hooks.ts';
import { selectPermissions, selectRole } from '@/store/slices/auth-slice.ts';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/utils/permissions.ts';

export function usePermissions() {
    const permissions = useAppSelector(selectPermissions);
    const role = useAppSelector(selectRole);

    return {
        permissions,
        role,
        hasWildcard: false,

        /**
         * Check if user has a specific permission
         */
        can: (permission: string) => hasPermission(permissions, permission),

        /**
         * Check if user has ANY of the specified permissions
         */
        canAny: (requiredPermissions: string[]) => hasAnyPermission(permissions, requiredPermissions),

        /**
         * Check if user has ALL of the specified permissions
         */
        canAll: (requiredPermissions: string[]) => hasAllPermissions(permissions, requiredPermissions),
    };
}

