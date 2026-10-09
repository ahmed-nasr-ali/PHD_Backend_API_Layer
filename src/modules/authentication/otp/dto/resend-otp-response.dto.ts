/** The JSON returned by `POST /auth/resend-otp`. Never holds the OTP. */
export interface ResendOtpResponseDto {
  userId: string;
  /** Always true: the CRM was asked for a new code (the SMS itself is sent by the CRM). */
  otpSent: true;
}
