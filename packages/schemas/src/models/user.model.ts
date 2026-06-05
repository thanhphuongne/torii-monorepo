import { z } from 'zod';

// User status is now determined by timestamps:
// - verifiedAt: null = pending verification
// - bannedUntil: not null = banned until this time
// - deletedAt: not null = soft deleted
// - All null + verifiedAt set = active

// Business Errors
export const ErrFirstNameAtLeast2Chars = new Error('First name must be at least 2 characters');
export const ErrEmailInvalid = new Error('Email is invalid');
export const ErrPasswordAtLeast8Chars = new Error('Password must be at least 8 characters');
export const ErrEmailExisted = new Error('Email already exists');
export const ErrInvalidCredentials = new Error('Invalid email or password');
export const ErrUserInactivated = new Error('User is inactivated or banned');
export const ErrInvalidToken = new Error('Invalid token');
export const ErrUserNotFound = new Error('User not found');
export const ErrForbidden = new Error('Forbidden');

// Zod Schema - Auth Only Fields
export const userSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(ErrEmailInvalid.message),
    displayName: z.string().min(2, ErrFirstNameAtLeast2Chars.message),
    password: z.string().min(8, ErrPasswordAtLeast8Chars.message).optional().nullable(),
    role: z.string().min(1),
    avatarUrl: z.string().url().optional().nullable(),
    appMetadata: z.record(z.unknown()).optional().nullable(),
    userMetadata: z.record(z.unknown()).optional().nullable(),
    verifiedAt: z.date().optional().nullable(),
    bannedUntil: z.date().optional().nullable(),
    lastSignInAt: z.date().optional().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().optional().nullable(),
    permissions: z.array(z.string()).optional(),
    linkedMethods: z.array(z.string()).optional(),
    isOnboarded: z.boolean().optional(),
    jlptTarget: z.string().optional().nullable(),
    currentLevel: z.string().optional().nullable(),
    walletBalance: z.coerce.number().optional().default(0),
    points: z.number().optional().default(0),
});

export type User = z.infer<typeof userSchema>;

