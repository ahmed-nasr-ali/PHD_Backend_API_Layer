/** What verify-otp needs: the user who registered and the 4-digit code from the SMS. */
export interface VerifyOtpInput {
  userId: string;
  otp: string;
}
