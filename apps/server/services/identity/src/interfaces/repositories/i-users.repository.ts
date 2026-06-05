import type { User, Prisma } from '@prisma/generated';
import type { OnboardingSurveyDTO } from '@workspace/schemas';

/**
 * Users Repository Interface
 * Defines the contract for all user data access operations
 */
export interface IUsersRepository {
  /**
   * Find user by ID
   * @param userId - The user's unique identifier
   * @returns The user if found, null otherwise
   */
  findById(userId: string): Promise<User | null>;

  /**
   * Find user by email
   * @param email - The user's email address
   * @returns The user if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find multiple users with pagination and filters
   * @param options - Query options including skip, take, where, and orderBy
   * @returns Array of users matching the criteria
   */
  findMany(options: {
    skip: number;
    take: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]>;

  /**
   * Count users with optional filter
   * @param where - Optional filter criteria
   * @returns Total count of users matching the criteria
   */
  count(where?: Prisma.UserWhereInput): Promise<number>;

  /**
   * Create a new user
   * @param data - User creation data
   * @returns The created user
   */
  create(data: Prisma.UserCreateInput): Promise<User>;

  /**
   * Update user by ID
   * @param userId - The user's unique identifier
   * @param data - User update data
   * @returns The updated user
   */
  update(userId: string, data: Prisma.UserUpdateInput): Promise<User>;

  /**
   * Update user by email
   * @param email - The user's email address
   * @param data - User update data
   * @returns The updated user
   */
  updateByEmail(email: string, data: Prisma.UserUpdateInput): Promise<User>;

  /**
   * Delete user permanently (hard delete)
   * @param userId - The user's unique identifier
   */
  delete(userId: string): Promise<void>;

  /**
   * Soft delete user by setting deletedAt timestamp
   * @param userId - The user's unique identifier
   * @returns The soft-deleted user
   */
  softDelete(userId: string): Promise<User>;

  /**
   * Check if an email already exists
   * @param email - The email address to check
   * @returns True if email exists, false otherwise
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Get user basic info with specific fields
   * @param userId - The user's unique identifier
   * @returns User basic info if found, null otherwise
   */
  getUserBasicInfo(userId: string): Promise<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    isOnboarded: boolean;
    avatarUrl: string | null;
    jlptTarget: string | null;
    currentLevel: string | null;
    userMetadata: Record<string, unknown> | null;
    verifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>;

  /**
   * Mark user's email as verified
   * @param userId - The user's unique identifier
   * @returns The updated user
   */
  markEmailAsVerified(userId: string): Promise<User>;

  /**
   * Find users by role
   * @param role - The role to filter by
   * @returns Array of users with the specified role
   */
  findByRole(role: string): Promise<User[]>;

  /**
   * Count users by role
   * @param role - The role to count
   * @returns Total count of users with the specified role
   */
  countByRole(role: string): Promise<number>;

  /**
   * Save onboarding preferences (stored on User)
   */
  saveOnboardingSurvey(userId: string, dto: OnboardingSurveyDTO): Promise<User>;
}
