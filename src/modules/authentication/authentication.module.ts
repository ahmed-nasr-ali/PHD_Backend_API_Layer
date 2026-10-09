import { Module } from '@nestjs/common';
import { RegisterModule } from './register/register.module';

/** `/auth/*`: one sub-module per feature folder (register; later otp, login, upload-files), each with its own layers. */
@Module({
  imports: [RegisterModule],
})
export class AuthenticationModule {}
