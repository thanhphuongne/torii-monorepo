/**
 * Webhook verification utilities
 */

import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * ClaimGrants interface for webhook verification
 */
interface ClaimGrants {
  sha256?: string;
}

/**
 * VerifyRequest verifies webhook request both for LiveKit & Wajlc
 * In Wajlc we're following the same token system as LiveKit is using
 * In this method we'll verify the provided body request
 *
 *
 * @param body - Request body as Buffer
 * @param apiKey - API key (expected issuer)
 * @param secret - API secret for verification
 * @param token - JWT token from Authorization header
 * @returns True if valid, false otherwise
 * @throws Error if verification fails
 */
export function verifyWebhookRequest(
  body: Buffer,
  apiKey: string,
  secret: string,
  token: string,
): boolean {
  try {
    // Parse and verify JWT token
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: apiKey,
    });

    // Validate issuer
    if (decoded.iss !== apiKey) {
      throw new Error('Invalid issuer');
    }

    // Calculate SHA256 hash of body
    const sha = crypto.createHash('sha256').update(body).digest();
    const hash = sha.toString('base64');

    // Compare hashes using constant-time comparison
    if (!constantTimeCompare(decoded.sha256 || '', hash)) {
      throw new Error("authorization token didn't match");
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Verification failed: ${error}`);
  }
}

/**
 * Constant-time string comparison
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Use crypto.timingSafeEqual for constant-time comparison
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
