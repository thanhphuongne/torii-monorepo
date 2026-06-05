import { Test, TestingModule } from '@nestjs/testing';
import { CertificateService } from '../src/modules/classroom/certificate/certificate.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';

describe('CertificateService', () => {
  let service: CertificateService;
  let prisma: PrismaService;
  let nats: any;

  const mockPrisma = {
    enrollment: {
      findUnique: jest.fn(),
    },
    certificate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    academyCourseProfileAssessment: {
      findMany: jest.fn(),
    },
    academyExamAttempt: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNats = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    prisma = module.get<PrismaService>(PrismaService);
    nats = module.get('NATS_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateForEnrollment', () => {
    const enrollmentId = 'e1';
    const mockEnrollment = {
      id: enrollmentId,
      userId: 'u1',
      status: 'COMPLETED',
      liveClassId: 'l1',
      liveClass: {
        id: 'l1',
        code: 'LC01',
        name: 'Live Class',
        cohort: { courseProfileId: 'cp1' },
      },
      user: { id: 'u1', displayName: 'John Doe' },
    };

    it('should throw NotFoundException if enrollment missing', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.generateForEnrollment(enrollmentId)).rejects.toThrow(NotFoundException);
    });

    it('should return early if enrollment not COMPLETED', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ ...mockEnrollment, status: 'ACTIVE' });
      const result = await service.generateForEnrollment(enrollmentId);
      expect(result).toBeUndefined();
    });

    it('should return existing certificate if it already exists', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.certificate.findUnique.mockResolvedValue({ id: 'cert1' });
      const result = await service.generateForEnrollment(enrollmentId);
      expect(result).toEqual({ id: 'cert1' });
      expect(mockPrisma.certificate.create).not.toHaveBeenCalled();
    });

    it('should generate new certificate with calculated average score', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.certificate.findUnique.mockResolvedValue(null);
      
      // Assessments check
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([
        { examId: 'ex1' },
        { examId: 'ex2' },
      ]);
      mockPrisma.academyExamAttempt.findMany.mockResolvedValue([
        { examId: 'ex1', percentage: 80 },
        { examId: 'ex2', percentage: 90 },
      ]);

      mockPrisma.certificate.create.mockImplementation(({ data }) => ({ id: 'new-cert', ...data }));

      const result = await service.generateForEnrollment(enrollmentId);

      expect(result.id).toBe('new-cert');
      expect(result.score).toBe(85); // (80 + 90) / 2
      expect(mockNats.emit).toHaveBeenCalledWith(
        { cmd: 'send_notification' },
        expect.objectContaining({ recipientId: 'u1' })
      );
    });

    it('should default to 0 if an attempt has null percentage', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.certificate.findUnique.mockResolvedValue(null);
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([{ examId: 'ex1' }]);
      mockPrisma.academyExamAttempt.findMany.mockResolvedValue([{ examId: 'ex1', percentage: null }]);
      mockPrisma.certificate.create.mockImplementation(({ data }) => ({ id: 'cert', ...data }));

      const result = await service.generateForEnrollment(enrollmentId);
      expect(result.score).toBe(0);
    });

    it('should handle zero assessments or attempts gracefully', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.certificate.findUnique.mockResolvedValue(null);
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([]);
      mockPrisma.certificate.create.mockResolvedValue({ id: 'new-cert', score: 0 });

      const result = await service.generateForEnrollment(enrollmentId);
      expect(result.score).toBe(0);
    });

    it('should generate certificate for VOD package enrollment', async () => {
      const vodEnrollment = {
        ...mockEnrollment,
        liveClassId: null,
        liveClass: null,
        vodPackageId: 'v1',
        vodPackage: { id: 'v1', code: 'VOD01', title: 'VOD Course', courseProfileId: 'cp1' },
      };
      mockPrisma.enrollment.findUnique.mockResolvedValue(vodEnrollment);
      mockPrisma.certificate.findUnique.mockResolvedValue(null);
      mockPrisma.certificate.create.mockImplementation(({ data }) => ({ id: 'vod-cert', ...data }));

      const result = await service.generateForEnrollment(enrollmentId);
      expect(result.id).toBe('vod-cert');
      expect(result.vodPackageId).toBe('v1');
    });

    it('should catch and log notification errors without failing', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.certificate.findUnique.mockResolvedValue(null);
      mockPrisma.certificate.create.mockResolvedValue({ id: 'cert' });
      
      mockNats.emit.mockImplementation(() => {
        throw new Error('NATS Fail');
      });

      const result = await service.generateForEnrollment(enrollmentId);
      expect(result.id).toBe('cert');
      expect(mockNats.emit).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should return all certificates for a user', async () => {
      const mockCerts = [{ id: 'c1', userId: 'u1' }];
      mockPrisma.certificate.findMany.mockResolvedValue(mockCerts);
      const result = await service.findByUserId('u1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }));
    });
  });

  describe('findAll', () => {
    it('should return paginated certificates', async () => {
      const mockItems = [{ id: 'c1', liveClass: { id: 'l1', code: 'LC1', name: 'N1' } }];
      mockPrisma.$transaction.mockResolvedValue([mockItems, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data[0].class.code).toBe('LC1');
    });

    it('should filter by userId and classId', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll({ userId: 'u1', classId: 'l1' });
      expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', liveClassId: 'l1' },
        }),
      );
    });

    it('should handle pagination edge cases (clamping)', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      const result = await service.findAll({ page: 0, limit: 1000 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });
  });

  describe('findById', () => {
    it('should return certificate with mapped class info', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({
        id: 'c1',
        liveClass: { id: 'l1', code: 'LC1', name: 'N1' },
      });
      const result = await service.findById('c1');
      expect(result.class.id).toBe('l1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyByCode', () => {
    it('should return valid=true if cert found', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({ id: 'c1', certificateCode: 'CODE1' });
      const result = await service.verifyByCode('CODE1');
      expect(result.valid).toBe(true);
    });

    it('should map class info if cert linked to VOD', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({
        id: 'c1',
        certificateCode: 'VOD1',
        vodPackage: { id: 'v1', code: 'V1', title: 'T1' },
      });
      const result = await service.verifyByCode('VOD1');
      expect(result.certificate.class.code).toBe('V1');
    });

    it('should return valid=false if cert not found', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);
      const result = await service.verifyByCode('CODE1');
      expect(result.valid).toBe(false);
    });
  });
});
