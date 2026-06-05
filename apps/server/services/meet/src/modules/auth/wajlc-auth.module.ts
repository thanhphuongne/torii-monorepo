/**
 * Wajlc Auth Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WajlcAuthService } from './wajlc-auth.service';

@Module({
  imports: [ConfigModule],
  providers: [WajlcAuthService],
  exports: [WajlcAuthService],
})
export class WajlcAuthModule {}
