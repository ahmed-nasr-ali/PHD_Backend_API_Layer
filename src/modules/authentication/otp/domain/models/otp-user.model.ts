import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { UserState } from '../../../shared/domain/enums/user-status.enum';
import { OtpUserProps } from './otp-user.props';

/** How long the CRM plugin keeps an OTP alive: expiry = send time + 5 min (tested on phdtest 2026-10-09). */
const OTP_LIFETIME_MS = 5 * 60_000;

/** A `com_users` row seen by verify / resend. Register has its own `User`: the OTP never enters it. */
export class OtpUser {
  readonly id: string;
  readonly registeredAs: RegisteredAs | null;
  private readonly state: UserState | null;
  /** Private: the OTP is only checked here, never read out (and never sent to the app). */
  private readonly otp: string | null;
  private readonly otpExpiresAt: Date | null;

  private constructor(props: OtpUserProps) {
    this.id = props.id;
    this.registeredAs = props.registeredAs;
    this.state = props.state;
    this.otp = props.otp;
    this.otpExpiresAt = props.otpExpiresAt;
  }

  /** A user loaded from storage: trusted data, no rules are run. */
  static restore(props: OtpUserProps): OtpUser {
    return new OtpUser(props);
  }

  /** statecode Inactive → deactivated by the CRM team · Active or unknown → not deactivated */
  get isDeactivated(): boolean {
    return this.state === UserState.Inactive;
  }

  /** When the last OTP was sent (expiry − 5 min; the CRM keeps no send time) · none sent → null */
  get otpSentAt(): Date | null {
    return this.otpExpiresAt
      ? new Date(this.otpExpiresAt.getTime() - OTP_LIFETIME_MS)
      : null;
  }

  /** same as the last OTP sent → true · different, or none sent → false */
  isOtpCorrect(otp: string): boolean {
    return this.otp !== null && this.otp === otp;
  }

  /** `now` after the expiry, or none sent → true · else → false (`now` passed in so tests control the clock) */
  isOtpExpired(now: Date): boolean {
    return !this.otpExpiresAt || now > this.otpExpiresAt;
  }
}
