import { OtpUserTableRow } from '../tables/otp-user.table';

/** OTP user columns to read ($select). */
export const OTP_USER_COLUMNS: (keyof OtpUserTableRow)[] = [
  'com_userid',
  'com_registeredas',
  'statecode',
  'com_otp',
  'com_otpexpirydate',
];
