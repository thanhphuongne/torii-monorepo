import type {
  UserResponseDTO,
  UserCreateDTO,
  UserUpdateDTO,
  PaginationOptionsDTO,
  PaginatedResponseDTO,
  Requester,
  AdminCreateInternalUserDTO,
  OnboardingSurveyDTO,
} from '@workspace/schemas';

/**
 * User with Permissions
 */
export interface UserWithPermissions extends UserResponseDTO {
  permissions: string[];
}

/**
 * Users Service Interface
 * Defines the contract for user business logic operations
 */
export interface IUsersService {
  /**
   * Find all users with pagination and search
   * @param options - Pagination options including page, limit, and search
   * @returns Paginated response of users
   */
  findAll(
    options: PaginationOptionsDTO,
  ): Promise<PaginatedResponseDTO<UserResponseDTO>>;

  /**
   * Find user by ID
   * @param id - The user's unique identifier
   * @returns The user data
   * @throws NotFoundException if user not found
   */
  findById(id: string): Promise<UserResponseDTO>;

  /**
   * Find user by email
   * @param email - The user's email
   * @returns The user data
   * @throws NotFoundException if user not found
   */
  findByEmail(email: string): Promise<UserResponseDTO>;

  /**
   * Create a new user (admin only)
   * @param dto - User creation data
   * @returns The created user
   * @throws BadRequestException if email already exists
   */
  create(dto: UserCreateDTO): Promise<UserResponseDTO>;

  /**
   * Create internal user (lecturer / staff-academic / staff-operations) with invite email
   * @param dto - Internal user creation data
   * @param adminId - ID of admin creating the user
   * @returns The created user
   * @throws BadRequestException if email already exists
   */
  createInternalUser(
    dto: AdminCreateInternalUserDTO,
    adminId: string,
  ): Promise<UserResponseDTO>;

  /**
   * Get user by ID (alias for findById)
   * @param userId - The user's unique identifier
   * @returns The user data
   * @throws NotFoundException if user not found
   */
  getUser(userId: string): Promise<UserResponseDTO>;

  /**
   * Get user with authorization permissions
   * Returns user info along with computed role and permissions
   * @param userId - The user's unique identifier
   * @returns User with permissions
   * @throws NotFoundException if user not found
   */
  getUserWithPermissions(userId: string): Promise<UserWithPermissions>;

  /**
   * Update user
   * @param requester - The user making the request
   * @param userId - The user's unique identifier
   * @param dto - User update data
   * @returns The updated user
   * @throws ForbiddenException if requester is not admin or the user themselves
   * @throws NotFoundException if user not found
   */
  update(
    requester: Requester,
    userId: string,
    dto: UserUpdateDTO,
  ): Promise<UserResponseDTO>;

  /**
   * Delete user (soft or hard delete)
   * @param requester - The user making the request
   * @param userId - The user's unique identifier
   * @param hardDelete - Whether to permanently delete (default: false for soft delete)
   * @returns Success message
   * @throws ForbiddenException if requester is not admin or the user themselves
   * @throws NotFoundException if user not found
   */
  delete(
    requester: Requester,
    userId: string,
    hardDelete?: boolean,
  ): Promise<{ message: string }>;

  /**
   * Change user status (active, banned, deleted)
   * @param requester - The user making the request
   * @param userId - The user's unique identifier
   * @param dto - Status change data
   * @returns The updated user
   * @throws ForbiddenException if requester is not admin
   * @throws NotFoundException if user not found
   */
  changeStatus(
    requester: Requester,
    userId: string,
    dto: any,
  ): Promise<UserResponseDTO>;

  /**
   * Save user onboarding survey
   */
  saveOnboardingSurvey(
    userId: string,
    dto: OnboardingSurveyDTO,
  ): Promise<{ success: boolean }>;
}
