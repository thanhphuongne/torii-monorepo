import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CertificateService } from './certificate.service';

@Controller()
export class CertificateListener {
  constructor(private readonly certificates: CertificateService) {}

  @EventPattern('enrollment.completed')
  async handleEnrollmentCompleted(@Payload() data: { enrollmentId: string }) {
    console.log('[Academy] Enrollment completed event received:', data);
    try {
      await this.certificates.generateForEnrollment(data.enrollmentId);
    } catch (error) {
      console.error(
        `[Academy] Failed to generate certificate for enrollment ${data.enrollmentId}:`,
        error.message,
      );
    }
  }
}
