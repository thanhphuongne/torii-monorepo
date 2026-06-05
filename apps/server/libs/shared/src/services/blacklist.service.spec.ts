import { Test, TestingModule } from '@nestjs/testing';
import { BlacklistService } from './blacklist.service';
import { REDIS_CLIENT } from '../redis/redis.provider';

describe('BlacklistService', () => {
  let service: BlacklistService;
  let redisMock: any;

  beforeEach(async () => {
    redisMock = {
      set: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlacklistService,
        {
          provide: REDIS_CLIENT,
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<BlacklistService>(BlacklistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should blacklist a token', async () => {
    await service.blacklist('token-123', 3600);
    expect(redisMock.set).toHaveBeenCalledWith(
      'blacklist:token:token-123',
      'revoked',
      'EX',
      3600,
    );
  });

  it('should check if token is blacklisted', async () => {
    redisMock.exists.mockResolvedValue(1);
    const result = await service.isBlacklisted('token-123');
    expect(result).toBe(true);
    expect(redisMock.exists).toHaveBeenCalledWith('blacklist:token:token-123');
  });

  it('should return false if token is not blacklisted', async () => {
    redisMock.exists.mockResolvedValue(0);
    const result = await service.isBlacklisted('token-123');
    expect(result).toBe(false);
  });
});
