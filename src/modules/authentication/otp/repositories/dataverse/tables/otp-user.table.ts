/** Dataverse table (entity set) that stores app users; register reads the same table through its own `user.table.ts`. */
export const OTP_USER_TABLE = 'com_users';

/** The `com_users` columns verify / resend read, exactly as the Web API returns them. */
export interface OtpUserTableRow {
  com_userid: string;
  com_registeredas: number | null;
  statecode: number | null;
  com_otp: string | null;
  com_otpexpirydate: string | null; // UTC ISO date-time (column is UserLocal: stored in UTC)
}

/** What verify-otp writes: the mobile is proven. */
export interface OtpUserMobileVerifiedWriteRow {
  com_mobileverified: true;
}

/** What resend-otp writes: the plugin makes a new com_otp + expiry, sends the SMS and sets this back to false. */
export interface OtpUserRequestOtpWriteRow {
  com_requestotp: true;
}
