import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { IUsersService } from '@server/identity/interfaces/services';
import { USERS_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import type {
  UserCreateDTO,
  UserAdminUpdateDTO,
  AdminCreateInternalUserDTO,
  Requester,
  OnboardingSurveyDTO,
} from '@workspace/schemas';

@Controller()
export class UsersHandler {
  constructor(
    @Inject(USERS_SERVICE_TOKEN) private readonly usersService: IUsersService,
  ) {}

  @MessagePattern({ cmd: 'identity.users.findAll' })
  async findAll(
    @Payload()
    data: {
      page: number;
      limit: number;
      search: string;
      role?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    return this.usersService.findAll(data);
  }

  @MessagePattern({ cmd: 'identity.users.findById' })
  async findById(@Payload() data: { id: string }) {
    return { user: await this.usersService.findById(data.id) };
  }

  @MessagePattern({ cmd: 'identity.users.findByEmail' })
  async findByEmail(@Payload() data: { email: string }) {
    return { user: await this.usersService.findByEmail(data.email) };
  }

  @MessagePattern({ cmd: 'identity.users.create' })
  async create(@Payload() dto: UserCreateDTO) {
    return { user: await this.usersService.create(dto) };
  }

  @MessagePattern({ cmd: 'identity.users.createInternal' })
  async createInternal(
    @Payload() data: { dto: AdminCreateInternalUserDTO; requesterId: string },
  ) {
    return {
      user: await this.usersService.createInternalUser(
        data.dto,
        data.requesterId,
      ),
    };
  }

  @MessagePattern({ cmd: 'identity.users.update' })
  async update(
    @Payload()
    data: {
      id: string;
      dto: UserAdminUpdateDTO;
      requester: Requester;
    },
  ) {
    return {
      user: await this.usersService.update(data.requester, data.id, data.dto),
    };
  }

  @MessagePattern({ cmd: 'identity.users.delete' })
  async delete(
    @Payload() data: { id: string; hardDelete: boolean; requester: Requester },
  ) {
    await this.usersService.delete(data.requester, data.id, data.hardDelete);
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.users.changeStatus' })
  async changeStatus(
    @Payload() data: { id: string; dto: any; requester: Requester },
  ) {
    return {
      user: await this.usersService.changeStatus(
        data.requester,
        data.id,
        data.dto,
      ),
    };
  }

  @MessagePattern({ cmd: 'identity.users.saveOnboardingSurvey' })
  async saveOnboardingSurvey(
    @Payload() data: { userId: string; dto: OnboardingSurveyDTO },
  ) {
    return this.usersService.saveOnboardingSurvey(data.userId, data.dto);
  }
}
