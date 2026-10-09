import { OtpUser } from '../domain/models/otp-user.model';
import { ResendOtpResponseDto } from '../dto/resend-otp-response.dto';

/** Translates the user who got a new code into the `resend-otp` response. */
export class ResendOtpResponseMapper {
  static toResponse(user: OtpUser): ResendOtpResponseDto {
    return { userId: user.id, otpSent: true };
  }
}
