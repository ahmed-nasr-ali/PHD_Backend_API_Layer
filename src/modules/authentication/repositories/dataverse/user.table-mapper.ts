import { optionSetValue } from '../../../../core/dataverse';
import { IdentityKind } from '../../domain/enums/identity-kind.enum';
import { RegisteredAs } from '../../domain/enums/registered-as.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { UserIdentity } from '../../domain/models/user-identity.model';
import { UserRegistrationData } from '../../domain/models/user-registration-data.model';
import { User } from '../../domain/models/user.model';
import { UserTableRow, UserTableWriteRow } from './tables/user.table';

/** Translates between `com_users` rows and the User domain model. */
export class UserTableMapper {
  static toDomain(row: UserTableRow): User {
    return User.restore({
      id: row.com_userid,
      name: row.com_name,
      mobile: row.com_mobilenumber,
      email: row.com_email,
      identity: UserTableMapper.toIdentity(row),
      birthDate: row.com_birthdate ? new Date(row.com_birthdate) : null,
      registeredAs: optionSetValue(RegisteredAs, row.com_registeredas),
      status: optionSetValue(UserStatus, row.statuscode),
      profilePicturePath: row.com_profilepicturefilepath,
    });
  }

  /** Both ID columns are always written: the unused one is cleared (a reused user may switch ID kind). */
  static toTableWriteRow(data: UserRegistrationData): UserTableWriteRow {
    const { kind, number } = data.identity;
    return {
      com_name: data.name,
      com_mobilenumber: data.mobile,
      com_email: data.email,
      com_password: data.password,
      com_nationalid: kind === IdentityKind.National ? number : null,
      com_passportnumber: kind === IdentityKind.Passport ? number : null,
      com_birthdate: data.birthDate
        ? data.birthDate.toISOString().slice(0, 10)
        : null,
      com_registeredas: data.registeredAs,
      statuscode: data.status,
      com_appnotificationtoken: data.notificationToken,
      com_requestotp: data.requestOtp ?? false,
    };
  }

  /** national ID → National · else passport → Passport · neither → null */
  private static toIdentity(row: UserTableRow): UserIdentity | null {
    if (row.com_nationalid) {
      return { kind: IdentityKind.National, number: row.com_nationalid };
    }
    if (row.com_passportnumber) {
      return { kind: IdentityKind.Passport, number: row.com_passportnumber };
    }
    return null;
  }
}
