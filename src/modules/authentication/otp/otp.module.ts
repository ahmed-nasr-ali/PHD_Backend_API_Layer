import { Module } from '@nestjs/common';
import { DataverseModule } from '../../../core/dataverse';
import { OtpController } from './controllers/otp.controller';
import { DataverseOtpUserRepository } from './repositories/dataverse/dataverse-otp-user.repository';
import { OtpUserRepository } from './repositories/otp-user.repository';
import { ResendOtpService } from './services/resend-otp.service';
import { VerifyOtpService } from './services/verify-otp.service';

/** `POST /auth/verify-otp` + `POST /auth/resend-otp`: everything the OTP needs lives in this folder (shared CRM enums in `../shared`). */
@Module({
  imports: [DataverseModule],
  controllers: [OtpController],
  providers: [
    VerifyOtpService,
    ResendOtpService,
    { provide: OtpUserRepository, useClass: DataverseOtpUserRepository },
  ],
})
export class OtpModule {}
