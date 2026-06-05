/**
 * Check if user has a specific permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
}

