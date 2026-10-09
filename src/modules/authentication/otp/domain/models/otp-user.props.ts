import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { UserState } from '../../../shared/domain/enums/user-status.enum';

/** What verify / resend need from a `com_users` row: who it is, whether it may use an OTP, and the OTP itself. */
export interface OtpUserProps {
  id: string;
  /** `null` when the CRM holds a value the enum doesn't know. */
  registeredAs: RegisteredAs | null;
  state: UserState | null;
  /** The last OTP the CRM plugin made · null → none sent yet */
  otp: string | null;
  /** When `otp` stops working (set by the plugin: send time + 5 min, UTC) · null → none sent yet */
  otpExpiresAt: Date | null;
}
