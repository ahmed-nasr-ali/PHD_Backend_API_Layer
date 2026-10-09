/** The JSON returned by `POST /auth/verify-otp`. Never holds the OTP. */
export interface VerifyOtpResponseDto {
  userId: string;
  /** Always true: any failure returns an error instead. */
  mobileVerified: true;
}
