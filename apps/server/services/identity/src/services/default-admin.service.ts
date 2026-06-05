import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService, AppConfigService } from '@server/shared';
import * as argon2 from 'argon2';

/**
 * Service to create default admin user on first application startup
 * This ensures there's always an admin account available for initial access
 */
@Injectable()
export class DefaultAdminService implements OnModuleInit {
  private readonly logger = new Logger(DefaultAdminService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Called when the module is initialized
   * Checks and creates default admin if needed
   */
  async onModuleInit() {
    await this.ensureDefaultAdmin();
  }

  /**
   * Ensures a default admin user exists
   * Only creates if the configured default admin does not exist yet
   */
  private async ensureDefaultAdmin(): Promise<void> {
    try {
      // Get default admin credentials from configuration
      const {
        email: adminEmail,
        password: adminPassword,
        displayName: adminDisplayName,
      } = this.appConfig.identity.defaultAdmin;

      // Check if default admin already exists by email
      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (existingAdmin) {
        this.logger.log(
          `✅ Default admin already exists with email ${adminEmail}. Skipping creation.`,
        );
        return;
      }

      // Hash the password
      const hashedPassword = await argon2.hash(adminPassword);

      // Create the default admin user
      const admin = await this.prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          displayName: adminDisplayName,
          role: 'admin',
          verifiedAt: new Date(), // Mark as verified
        },
      });

      this.logger.log('🎉 Default admin user created successfully!');
      this.logger.log(`   📧 Email: ${adminEmail}`);
      this.logger.log(`   🔑 Password: ${adminPassword}`);
      this.logger.log(`   👤 Role: ADMIN`);
      this.logger.warn(
        '⚠️  IMPORTANT: Please change the default password after first login!',
      );
    } catch (error) {
      this.logger.error('❌ Failed to create default admin user:', error);
      // Don't throw error to prevent application from failing to start
      // The admin can be created manually if needed
    }
  }
}
