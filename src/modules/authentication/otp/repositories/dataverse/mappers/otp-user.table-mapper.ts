import { optionSetValue } from '../../../../../../core/dataverse';
import { RegisteredAs } from '../../../../shared/domain/enums/registered-as.enum';
import { UserState } from '../../../../shared/domain/enums/user-status.enum';
import { OtpUser } from '../../../domain/models/otp-user.model';
import { OtpUserTableRow } from '../tables/otp-user.table';

/** Translates a `com_users` row into the OtpUser domain model. */
export class OtpUserTableMapper {
  static toDomain(row: OtpUserTableRow): OtpUser {
    return OtpUser.restore({
      id: row.com_userid,
      registeredAs: optionSetValue(RegisteredAs, row.com_registeredas),
      state: optionSetValue(UserState, row.statecode),
      otp: row.com_otp,
      otpExpiresAt: row.com_otpexpirydate
        ? new Date(row.com_otpexpirydate)
        : null,
    });
  }
}
