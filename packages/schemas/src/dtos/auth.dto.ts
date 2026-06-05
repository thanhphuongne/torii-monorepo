import { z } from 'zod';
import { userResponseDTOSchema } from './user.dto';

/**
 * Auth Response DTO - Used for register and OAuth flows
 * Contains user data and access token
 */
export const authResponseDTOSchema = z.object({
    user: userResponseDTOSchema,
    accessToken: z.string(),
    refreshToken: z.string().optional(),
});

export type AuthResponseDTO = z.infer<typeof authResponseDTOSchema>;

/**
 * Login Response DTO - Supports 2FA flow
 * If 2FA is required, only tempToken is returned
 * Otherwise, user and accessToken are returned
 */
export const loginResponseDTOSchema = z.object({
    requiresTwoFactor: z.boolean(),
    twoFactorMethod: z.enum(['totp']).optional(),
    tempToken: z.string().optional(),
    user: userResponseDTOSchema.optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
});

export type LoginResponseDTO = z.infer<typeof loginResponseDTOSchema>;

/**
 * Auth Result DTO - Generic result for auth operations
 */
export const authResultDTOSchema = z.object({
    success: z.boolean(),
    data: z.union([
        authResponseDTOSchema,
        z.object({ user: userResponseDTOSchema })
    ]).optional(),
    message: z.string().optional(),
});

export type AuthResultDTO = z.infer<typeof authResultDTOSchema>;

/**
 * OTP Verification DTO
 */
export const verifyOTPDTOSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    type: z.enum(['registration', 'reset-password']),
});

export type VerifyOTPDTO = z.infer<typeof verifyOTPDTOSchema>;

/**
 * OTP Resend DTO
 */
export const resendOTPDTOSchema = z.object({
    email: z.string().email(),
    type: z.enum(['registration', 'reset-password']),
});

export type ResendOTPDTO = z.infer<typeof resendOTPDTOSchema>;

/**
 * Forgot Password DTO
 */
export const forgotPasswordDTOSchema = z.object({
    email: z.string().email(),
    platform: z.enum(['web', 'mobile']).optional().default('web'),
    clientType: z.enum(['admin', 'learner']).optional().default('learner'),
});

export type ForgotPasswordDTO = z.infer<typeof forgotPasswordDTOSchema>;


/**
 * Logout DTO
 */
export const logoutDTOSchema = z.object({
    refreshToken: z.string().optional(),
});

export type LogoutDTO = z.infer<typeof logoutDTOSchema>;
