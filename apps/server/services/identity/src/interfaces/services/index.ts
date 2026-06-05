/**
 * Service Interfaces and Injection Tokens
 * Central export point for all service interfaces and their corresponding DI tokens
 */

// Export all service interfaces
export * from './i-users.service';
export * from './i-auth.service';
export * from './i-session.service';
export * from './i-google-auth.service';
export * from './i-facebook-auth.service';
export * from './i-audit-log.service';
export * from './i-authorization.service';
export * from './i-two-factor-auth.service';
export * from './i-notification.service';

// Injection tokens for dependency injection
export const USERS_SERVICE_TOKEN = Symbol('USERS_SERVICE');
export const AUTH_SERVICE_TOKEN = Symbol('AUTH_SERVICE');
export const SESSION_SERVICE_TOKEN = Symbol('SESSION_SERVICE');
export const GOOGLE_AUTH_SERVICE_TOKEN = Symbol('GOOGLE_AUTH_SERVICE');
export const FACEBOOK_AUTH_SERVICE_TOKEN = Symbol('FACEBOOK_AUTH_SERVICE');
export const AUDIT_LOG_SERVICE_TOKEN = Symbol('AUDIT_LOG_SERVICE');
export const AUTHORIZATION_SERVICE_TOKEN = Symbol('AUTHORIZATION_SERVICE');
export const TWO_FACTOR_AUTH_SERVICE_TOKEN = Symbol('TWO_FACTOR_AUTH_SERVICE');
export const SMS_SERVICE_TOKEN = Symbol('SMS_SERVICE');
export const NOTIFICATION_SERVICE_TOKEN = Symbol('NOTIFICATION_SERVICE');
