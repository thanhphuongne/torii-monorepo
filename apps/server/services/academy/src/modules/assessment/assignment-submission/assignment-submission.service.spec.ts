import { BadRequestException } from '@nestjs/common';
import { AssignmentSubmissionService } from './assignment-submission.service';

describe('AssignmentSubmissionService', () => {
  it('rejects create without userId', async () => {
    const prisma = {} as any;
    const service = new AssignmentSubmissionService(prisma, {
      log: jest.fn(),
    } as any);

    await expect(
      service.create(
        {
          classAssessmentId: '00000000-0000-4000-8000-000000000001',
        } as any,
        'SYSTEM',
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
