import { Module } from '@nestjs/common';
import { OtpModule } from './otp/otp.module';
import { RegisterModule } from './register/register.module';

/** `/auth/*`: one sub-module per feature folder (register, otp; later login, upload-files), each with its own layers. */
@Module({
  imports: [RegisterModule, OtpModule],
})
export class AuthenticationModule {}
