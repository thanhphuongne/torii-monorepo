import { z } from 'zod';

/**
 * Enable TOTP 2FA DTO
 * Used to enable TOTP with secret and verification code
 */
export const enableTotpDTOSchema = z.object({
    secret: z.string().min(1, 'Secret is required'),
    code: z.string().length(6, 'Code must be exactly 6 digits'),
});

export type EnableTotpDTO = z.infer<typeof enableTotpDTOSchema>;

/**
 * Verify 2FA DTO
 * Used during login to verify 2FA code with temp token
 */
export const verify2FADTOSchema = z.object({
    tempToken: z.string().min(1, 'Temporary token is required'),
    code: z.string().min(6, 'Code must be at least 6 characters').max(8, 'Code is too long'),
    backupCode: z.boolean().optional(),
});

export type Verify2FADTO = z.infer<typeof verify2FADTOSchema>;

/**
 * Disable 2FA DTO
 * Used to disable 2FA with password verification
 */
export const disable2FADTOSchema = z.object({
    password: z.string().min(1, 'Password is required'),
});

export type Disable2FADTO = z.infer<typeof disable2FADTOSchema>;

// ========================================
// 2FA Response Types
// ========================================

/**
 * 2FA Method Types
 */
export const twoFactorMethodSchema = z.enum(['totp']);
export type TwoFactorMethod = z.infer<typeof twoFactorMethodSchema>;

/**
 * 2FA Status Response
 */
export const twoFactorAuthStatusSchema = z.object({
    isEnabled: z.boolean(),
    method: twoFactorMethodSchema.optional(),
    backupCodesRemaining: z.number().optional(),
    enabledAt: z.date().optional(),
    lastUsedAt: z.date().optional(),
});

export type TwoFactorAuthStatus = z.infer<typeof twoFactorAuthStatusSchema>;

/**
 * TOTP Setup Response
 */
export const totpSetupResponseSchema = z.object({
    secret: z.string(),
    qrCodeUrl: z.string(),
    manualEntryKey: z.string(),
});

export type TotpSetupResponse = z.infer<typeof totpSetupResponseSchema>;

/**
 * Enable TOTP Response
 */
export const enableTotpResponseSchema = z.object({
    success: z.boolean(),
    backupCodes: z.array(z.string()),
    message: z.string(),
});

export type EnableTotpResponse = z.infer<typeof enableTotpResponseSchema>;

/**
 * Temporary 2FA Token Payload (internal use)
 */
export const twoFactorTempTokenPayloadSchema = z.object({
    userId: z.string(),
    email: z.string().email(),
    method: twoFactorMethodSchema,
    iat: z.number(),
    exp: z.number(),
});

export type TwoFactorTempTokenPayload = z.infer<typeof twoFactorTempTokenPayloadSchema>;
