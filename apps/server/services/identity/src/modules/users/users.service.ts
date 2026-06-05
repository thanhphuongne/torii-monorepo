import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  ConflictException,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectMapper } from '@automapper/nestjs';
import type { Mapper } from '@automapper/core';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import type {
  UserUpdateDTO,
  UserAdminUpdateDTO,
  Requester,
  UserCreateDTO,
  PaginationOptionsDTO,
  PaginatedResponseDTO,
  AdminCreateInternalUserDTO,
  OnboardingSurveyDTO,
} from '@workspace/schemas';
import {
  userUpdateDTOSchema,
  userAdminUpdateDTOSchema,
  UserResponseDTO,
  ErrEmailExisted,
  ErrUserNotFound,
} from '@workspace/schemas';
import type { User, Prisma } from '@prisma/generated';
import type { IUsersRepository } from '@server/identity/interfaces/repositories';
import type {
  IUsersService,
  IAuthorizationService,
  UserWithPermissions,
  ISessionService,
} from '@server/identity/interfaces/services';
import { USERS_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';
import {
  AUTHORIZATION_SERVICE_TOKEN,
  SESSION_SERVICE_TOKEN,
} from '@server/identity/interfaces/services';
import {
  REDIS_CLIENT,
  generateSecureRandomString,
  AppConfigService,
} from '@server/shared';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    private readonly appConfig: AppConfigService,
    @Inject(USERS_REPOSITORY_TOKEN)
    private readonly usersRepository: IUsersRepository,
    @Inject(AUTHORIZATION_SERVICE_TOKEN)
    private readonly authorizationService: IAuthorizationService,
    @Inject(forwardRef(() => SESSION_SERVICE_TOKEN))
    private readonly sessionService: ISessionService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectMapper() private readonly mapper: Mapper,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  private readonly logger = new Logger(UsersService.name);

  /**
   * Helper to emit audit log event
   */
  private async createAuditLog(entry: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    description: string;
    metadata?: any;
    oldValues?: any;
    newValues?: any;
  }) {
    try {
      this.natsClient.emit({ cmd: 'identity.audit.log' }, entry);
    } catch (error) {
      this.logger.error(`Failed to emit audit log: ${error.message}`);
    }
  }

  /**
   * Helper to check if requester has a specific permission
   */
  private hasPermission(requester: Requester, permission: string): boolean {
    if (!requester.permissions) return false;
    return requester.permissions.includes(permission);
  }

  /**
   * Find all users with pagination and search
   */
  async findAll(
    options: PaginationOptionsDTO & {
      role?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<PaginatedResponseDTO<UserResponseDTO>> {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = options;

    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.UserWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        role ? { role } : {},
      ],
    };

    // Validate sortBy field to prevent SQL injection
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'email',
      'displayName',
      'role',
    ];
    const orderByField = validSortFields.includes(sortBy)
      ? sortBy
      : 'updatedAt';
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [orderByField]: sortOrder,
    };

    const [users, total] = await Promise.all([
      this.usersRepository.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
      }),
      this.usersRepository.count(where),
    ]);

    // Map Prisma User to UserResponseDTO using AutoMapper
    const data: UserResponseDTO[] = users.map((user) =>
      this.mapper.map<User, UserResponseDTO>(user, 'User', 'UserResponseDTO'),
    );

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    } as any;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserResponseDTO> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapper.map<User, UserResponseDTO>(
      user,
      'User',
      'UserResponseDTO',
    ) as any;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserResponseDTO> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.usersRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapper.map<User, UserResponseDTO>(
      user,
      'User',
      'UserResponseDTO',
    ) as any;
  }

  /**
   * Create new user (admin only)
   * Note: Firebase handles authentication, no password stored in DB
   */
  async create(dto: UserCreateDTO): Promise<UserResponseDTO> {
    // Check email exists
    const emailExists = await this.usersRepository.emailExists(dto.email);
    if (emailExists) {
      throw new BadRequestException(ErrEmailExisted.message);
    }

    // Create user (Firebase handles password authentication)
    const newId = uuidv4();
    const email = dto.email.toLowerCase();
    const user = await this.usersRepository.create({
      id: newId,
      email,
      displayName: dto.displayName,
      role: dto.role || 'learner',
      password: dto.password || null,
      // verifiedAt: null (default) = pending
    });

    // Map Prisma User to UserResponseDTO using AutoMapper
    return this.mapper.map<User, UserResponseDTO>(
      user,
      'User',
      'UserResponseDTO',
    ) as any;
  }

  /**
   * Create internal user (lecturer / staff-academic / staff-operations) with invite email
   * Auto-generates random password, hashes it, and sends via email
   */
  async createInternalUser(
    dto: AdminCreateInternalUserDTO,
    adminId: string,
  ): Promise<UserResponseDTO> {
    // Check email exists
    const emailExists = await this.usersRepository.emailExists(dto.email);
    if (emailExists) {
      throw new ConflictException(ErrEmailExisted.message);
    }

    // Generate random password (12 characters, mixed case + numbers)
    const randomPassword = generateSecureRandomString(12);

    // Hash password using Argon2
    const hashedPassword = await argon2.hash(randomPassword);

    const email = dto.email.toLowerCase();

    // Create user with hashed password and auto-verify email
    const newId = uuidv4();
    const user = await this.usersRepository.create({
      id: newId,
      email,
      displayName: dto.displayName,
      role: dto.role,
      password: hashedPassword, // Store hashed password
      verifiedAt: new Date(), // Auto-verify email when account is created
    });

    // Generate invite token (valid for 7 days) - for email verification if needed
    const cryptoModule = await import('crypto');
    const inviteToken = cryptoModule.randomBytes(32).toString('hex');

    // Store invite token in Redis (7 days expiry) - kept for potential future use
    await this.redis.set(`invite-token:${inviteToken}`, user.id, 'EX', 604800); // 7 days

    // Send invite email with password - link to login page
    // Lecturer / staff-academic / staff-operations: đăng nhập web-admin — dùng webAdminUrl
    const loginUrl = `${this.appConfig.identity.webAdminUrl.replace(/\/+$/, '')}/login`;
    this.natsClient.emit(
      { cmd: 'send_email' },
      {
        type: 'invite',
        to: user.email,
        data: {
          displayName: user.displayName,
          inviteUrl: loginUrl,
          password: randomPassword,
        },
      },
    );

    await this.createAuditLog({
      userId: adminId,
      action: 'user.create_internal',
      entity: 'user',
      entityId: user.id,
      description: `Admin created internal user: ${user.email} with role ${user.role}`,
      newValues: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
    });

    // Map Prisma User to UserResponseDTO using AutoMapper
    return this.mapper.map<User, UserResponseDTO>(
      user,
      'User',
      'UserResponseDTO',
    ) as any;
  }

  /**
   * Get user by ID (alias for findById)
   */
  async getUser(userId: string): Promise<UserResponseDTO> {
    return this.findById(userId);
  }

  /**
   * Get user with authorization permissions (role + permission list từ RBAC)
   */
  async getUserWithPermissions(userId: string): Promise<UserWithPermissions> {
    const user = await this.usersRepository.getUserBasicInfo(userId);

    if (!user) {
      throw new NotFoundException(ErrUserNotFound.message);
    }

    // Get permissions from authorization service
    const authorizationData =
      await this.authorizationService.getUserPermissions(user.id, user.role);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as string,
      verifiedAt: user.verifiedAt,
      bannedUntil: null,
      lastSignInAt: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: null,
      permissions: authorizationData.permissions,
    } as any;
  }

  /**
   * Update user (self or via admin)
   */
  async update(
    requester: Requester,
    userId: string,
    dto: UserAdminUpdateDTO | UserUpdateDTO,
  ): Promise<UserResponseDTO> {
    const isAdminUpdate = this.hasPermission(requester, 'ops.user.manage');

    // Security check: Can edit self, or has ops.user.manage permission
    if (requester.sub !== userId && !isAdminUpdate) {
      throw new ForbiddenException('Forbidden');
    }

    // Use appropriate schema based on permissions
    const data = isAdminUpdate
      ? userAdminUpdateDTOSchema.parse(dto)
      : userUpdateDTOSchema.parse(dto);

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = { ...data };

    // Handle password hashing if provided (not handled by provider in some flows)
    if (updateData.password && typeof updateData.password === 'string') {
      updateData.password = await argon2.hash(updateData.password);
    }

    // Role and Email updates are already allowed if isAdminUpdate = true
    // as they are parsed from userAdminUpdateDTOSchema

    const updatedUser = await this.usersRepository.update(userId, updateData);

    await this.createAuditLog({
      userId: requester.sub,
      action:
        requester.sub === userId ? 'user.update_self' : 'user.update_admin',
      entity: 'user',
      entityId: userId,
      description:
        requester.sub === userId
          ? 'User updated their profile'
          : `Admin updated user: ${user.email}`,
      oldValues: {
        role: user.role,
        email: user.email,
        displayName: user.displayName,
      },
      newValues: {
        role: updatedUser.role,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
      },
    });

    // Map Prisma User to UserResponseDTO using AutoMapper
    return this.mapper.map<User, UserResponseDTO>(
      updatedUser,
      'User',
      'UserResponseDTO',
    ) as any;
  }

  /**
   * Delete user (soft or hard delete)
   */
  async delete(
    requester: Requester,
    userId: string,
    hardDelete: boolean = false,
  ): Promise<{ message: string }> {
    // Can delete self, or has ops.user.manage permission
    if (
      requester.sub !== userId &&
      !this.hasPermission(requester, 'ops.user.manage')
    ) {
      throw new ForbiddenException('Forbidden');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (hardDelete) {
      // Hard delete - permanently remove from database
      await this.usersRepository.delete(userId);
      return { message: 'User permanently deleted' };
    } else {
      // Soft delete - mark as deleted
      await this.usersRepository.softDelete(userId);
    }

    await this.createAuditLog({
      userId: requester.sub,
      action: hardDelete ? 'user.hard_delete' : 'user.delete',
      entity: 'user',
      entityId: userId,
      description: `${hardDelete ? 'Hard deleted' : 'Soft deleted'} user: ${user.email}`,
      oldValues: user,
    });

    return {
      message: hardDelete ? 'User permanently deleted' : 'User soft deleted',
    };
  }

  /**
   * Change user status (active, banned, deleted)
   */
  async changeStatus(
    requester: Requester,
    userId: string,
    dto: any,
  ): Promise<UserResponseDTO> {
    // Only admin can change status
    if (!this.hasPermission(requester, 'ops.user.manage')) {
      throw new ForbiddenException('Forbidden');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-ban
    if (userId === requester.sub) {
      throw new BadRequestException(
        'Bạn không thể tự thay đổi trạng thái của chính mình.',
      );
    }

    const updateData: Prisma.UserUpdateInput = {};

    switch (dto.status) {
      case 'active':
        updateData.bannedUntil = null;
        updateData.deletedAt = null;
        // If user was never verified, should we verify them?
        // Usually 'active' means 'not banned and not deleted'.
        break;
      case 'banned':
        updateData.bannedUntil = dto.bannedUntil
          ? new Date(dto.bannedUntil)
          : new Date('9999-12-31');
        updateData.deletedAt = null;
        break;
      case 'deleted':
        updateData.deletedAt = new Date();
        updateData.bannedUntil = null;
        break;
    }

    const updatedUser = await this.usersRepository.update(userId, updateData);

    // If banned or deleted, revoke all sessions
    if (dto.status === 'banned' || dto.status === 'deleted') {
      await this.sessionService.revokeAllUserSessions(userId);
    }

    await this.createAuditLog({
      userId: requester.sub,
      action: 'user.change_status',
      entity: 'user',
      entityId: userId,
      description: `Admin changed user status to ${dto.status} for ${user.email}`,
      oldValues: { bannedUntil: user.bannedUntil, deletedAt: user.deletedAt },
      newValues: {
        bannedUntil: updatedUser.bannedUntil,
        deletedAt: updatedUser.deletedAt,
      },
    });

    return this.mapper.map<User, UserResponseDTO>(
      updatedUser,
      'User',
      'UserResponseDTO',
    ) as any;
  }
  /**
   * Save user onboarding survey
   */
  async saveOnboardingSurvey(
    userId: string,
    dto: OnboardingSurveyDTO,
  ): Promise<{ success: boolean }> {
    await this.usersRepository.saveOnboardingSurvey(userId, dto);
    return { success: true };
  }

  // No separate onboarding survey table anymore.
}
