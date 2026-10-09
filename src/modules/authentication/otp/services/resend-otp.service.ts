import { Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../domain/errors/otp.errors';
import { OtpUser } from '../domain/models/otp-user.model';
import { ensureCanUseOtp } from '../domain/rules/ensure-can-use-otp';
import { ensureResendAllowed } from '../domain/rules/ensure-resend-allowed';
import { OtpUserRepository } from '../repositories/otp-user.repository';

@Injectable()
export class ResendOtpService {
  constructor(private readonly users: OtpUserRepository) {}

  /**
   * unknown user → USER_NOT_FOUND · deactivated → USER_DEACTIVATED · not an Owner → OTP_NOT_ALLOWED
   * · < 60 s since the last send → OTP_RESEND_TOO_SOON (429 + seconds left) · else → the CRM sends a new code
   */
  async execute(userId: string): Promise<OtpUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    ensureCanUseOtp(user);
    ensureResendAllowed(user, new Date());

    await this.users.requestOtp(user.id);
    return user;
  }
}
