import { OtpUser } from '../domain/models/otp-user.model';
import { VerifyOtpResponseDto } from '../dto/verify-otp-response.dto';

/** Translates the verified user into the `verify-otp` response. */
export class VerifyOtpResponseMapper {
  static toResponse(user: OtpUser): VerifyOtpResponseDto {
    return { userId: user.id, mobileVerified: true };
  }
}
