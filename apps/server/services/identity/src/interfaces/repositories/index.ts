/**
 * Repository Interfaces and Injection Tokens
 * Central export point for all repository interfaces and their corresponding DI tokens
 */

// Export all repository interfaces
export * from './i-users.repository';
export * from './i-user-identity.repository';
export * from './i-audit-log.repository';
export * from './i-two-factor-auth.repository';
export * from './i-notification.repository';

// Injection tokens for dependency injection
export const USERS_REPOSITORY_TOKEN = Symbol('USERS_REPOSITORY');
export const USER_IDENTITY_REPOSITORY_TOKEN = Symbol(
  'USER_IDENTITY_REPOSITORY',
);
export const AUDIT_LOG_REPOSITORY_TOKEN = Symbol('AUDIT_LOG_REPOSITORY');
export const TWO_FACTOR_AUTH_REPOSITORY_TOKEN = Symbol(
  'TWO_FACTOR_AUTH_REPOSITORY',
);
export const NOTIFICATION_REPOSITORY_TOKEN = Symbol('NOTIFICATION_REPOSITORY');
