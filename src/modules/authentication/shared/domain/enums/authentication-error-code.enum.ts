/** Codes the authentication module returns in the error envelope. Part of the API contract: never rename a value. */
export enum AuthenticationErrorCode {
  UserExists = 'USER_EXISTS',
  UserDeactivated = 'USER_DEACTIVATED',
  NotPhdCustomer = 'NOT_PHD_CUSTOMER',
  UserNotFound = 'USER_NOT_FOUND',
  OtpNotAllowed = 'OTP_NOT_ALLOWED',
  OtpInvalid = 'OTP_INVALID',
  OtpExpired = 'OTP_EXPIRED',
  OtpResendTooSoon = 'OTP_RESEND_TOO_SOON',
}
