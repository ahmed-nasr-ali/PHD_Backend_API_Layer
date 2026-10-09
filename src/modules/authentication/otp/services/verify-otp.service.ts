import { Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../domain/errors/otp.errors';
import { OtpUser } from '../domain/models/otp-user.model';
import { ensureCanUseOtp } from '../domain/rules/ensure-can-use-otp';
import { ensureOtpValid } from '../domain/rules/ensure-otp-valid';
import { OtpUserRepository } from '../repositories/otp-user.repository';
import type { VerifyOtpInput } from './verify-otp.input';

@Injectable()
export class VerifyOtpService {
  constructor(private readonly users: OtpUserRepository) {}

  /**
   * unknown user → USER_NOT_FOUND · deactivated → USER_DEACTIVATED · not an Owner → OTP_NOT_ALLOWED
   * · wrong code → OTP_INVALID · late → OTP_EXPIRED · else → mobile marked verified, returns the user
   */
  async execute(input: VerifyOtpInput): Promise<OtpUser> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    ensureCanUseOtp(user);
    ensureOtpValid(user, input.otp, new Date());

    await this.users.markMobileVerified(user.id);
    return user;
  }
}
