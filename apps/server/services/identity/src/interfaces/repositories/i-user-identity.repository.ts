import type { UserIdentity, Prisma } from '@prisma/generated';

/**
 * User Identity Repository Interface
 * Defines the contract for OAuth provider identity data access operations
 */
export interface IUserIdentityRepository {
  /**
   * Find all identities for a user
   * @param userId - The user's unique identifier
   * @returns Array of user identities
   */
  findByUserId(userId: string): Promise<UserIdentity[]>;

  /**
   * Find identity by provider and provider ID
   * @param provider - The OAuth provider name (e.g., 'google')
   * @param providerId - The provider's unique identifier for the user
   * @returns The user identity if found, null otherwise
   */
  findByProvider(
    provider: string,
    providerId: string,
  ): Promise<UserIdentity | null>;

  /**
   * Find identity by ID
   * @param id - The identity's unique identifier
   * @returns The user identity if found, null otherwise
   */
  findById(id: string): Promise<UserIdentity | null>;

  /**
   * Create a new user identity
   * @param data - User identity creation data
   * @returns The created user identity
   */
  create(data: Prisma.UserIdentityCreateInput): Promise<UserIdentity>;

  /**
   * Update last sign-in timestamp for an identity
   * @param id - The identity's unique identifier
   */
  updateLastSignIn(id: string): Promise<void>;

  /**
   * Delete a user identity
   * @param id - The identity's unique identifier
   */
  delete(id: string): Promise<void>;

  /**
   * Get list of provider names for a user
   * @param userId - The user's unique identifier
   * @returns Array of provider names (e.g., ['google', 'facebook'])
   */
  getProviders(userId: string): Promise<string[]>;

  /**
   * Check if user has a specific provider linked
   * @param userId - The user's unique identifier
   * @param provider - The provider name to check
   * @returns True if the user has this provider linked, false otherwise
   */
  hasProvider(userId: string, provider: string): Promise<boolean>;

  /**
   * Count identities for a user
   * @param userId - The user's unique identifier
   * @returns Total count of identities for the user
   */
  countByUserId(userId: string): Promise<number>;
}
