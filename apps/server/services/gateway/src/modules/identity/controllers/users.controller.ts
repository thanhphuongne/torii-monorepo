import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ZodValidationPipe,
  successResponse,
  errorResponse,
  successPaginatedResponse,
  GatewayAuthGuard,
  PermissionsGuard,
  Permissions,
  ReqWithRequester,
} from '@server/shared';
import {
  userCreateDTOSchema,
  userAdminUpdateDTOSchema,
  adminCreateInternalUserDTOSchema,
  userSearchRequestDTOSchema,
  userChangeStatusDTOSchema,
} from '@workspace/schemas';
import type {
  UserCreateDTO,
  UserAdminUpdateDTO,
  AdminCreateInternalUserDTO,
  UserSearchRequestDTO,
  UserChangeStatusDTO,
} from '@workspace/schemas';

@Controller('api/admin/users')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('search')
  @Permissions('ops.user.view')
  async findAll(
    @Body(new ZodValidationPipe(userSearchRequestDTOSchema))
    dto: UserSearchRequestDTO,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.users.findAll' }, dto),
      );
      return successPaginatedResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch users',
      );
    }
  }

  @Get(':id')
  @Permissions('ops.user.view')
  async findById(@Param('id') id: string) {
    try {
      const user = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.users.findById' }, { id }),
      );
      return successResponse({ user });
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'User not found',
      );
    }
  }

  @Post()
  @Permissions('ops.user.manage')
  async create(
    @Body(new ZodValidationPipe(userCreateDTOSchema)) dto: UserCreateDTO,
  ) {
    try {
      const user = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.users.create' }, dto),
      );
      return successResponse({ user }, 'User created successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to create user',
      );
    }
  }

  @Post('internal')
  @Permissions('ops.user.manage')
  async createInternal(
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(adminCreateInternalUserDTOSchema))
    dto: AdminCreateInternalUserDTO,
  ) {
    try {
      const requester = req.requester;
      const newUser = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.users.createInternal' },
          { dto, requesterId: requester.sub },
        ),
      );
      return successResponse(
        { user: newUser },
        'Internal user created successfully',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to create internal user',
      );
    }
  }

  @Patch(':id')
  @Permissions('ops.user.manage')
  async update(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userAdminUpdateDTOSchema))
    dto: UserAdminUpdateDTO,
  ) {
    try {
      const requester = req.requester;
      const updatedUser = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.users.update' },
          {
            id,
            dto,
            requester: {
              sub: requester.sub,
              permissions: requester.permissions || [],
            },
          },
        ),
      );
      return successResponse(
        { user: updatedUser },
        'User updated successfully',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to update user',
      );
    }
  }

  @Delete(':id')
  @Permissions('ops.user.manage')
  async delete(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
    @Query('hardDelete') hardDelete?: string,
  ) {
    try {
      const requester = req.requester;
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.users.delete' },
          {
            id,
            hardDelete: hardDelete === 'true',
            requester: {
              sub: requester.sub,
              permissions: requester.permissions || [],
            },
          },
        ),
      );
      return successResponse(null, 'User deleted successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to delete user',
      );
    }
  }

  @Patch(':id/status')
  @Permissions('ops.user.manage')
  async changeStatus(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userChangeStatusDTOSchema))
    dto: UserChangeStatusDTO,
  ) {
    try {
      const requester = req.requester;
      const updatedUser = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.users.changeStatus' },
          {
            id,
            dto,
            requester: {
              sub: requester.sub,
              permissions: requester.permissions || [],
            },
          },
        ),
      );
      return successResponse(
        { user: updatedUser },
        'User status updated successfully',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to update user status',
      );
    }
  }
}
