/** Dataverse table (entity set) that stores app users. */
export const USER_TABLE = 'com_users';

/** One `com_users` row, exactly as the Web API returns it. */
export interface UserTableRow {
  com_userid: string;
  com_name: string | null;
  com_mobilenumber: string | null;
  com_email: string | null;
  com_nationalid: string | null;
  com_passportnumber: string | null;
  com_birthdate: string | null; // ISO date
  com_registeredas: number | null;
  statuscode: number | null;
  statecode: number | null;
  com_profilepicturefilepath: string | null;
}

/** What register writes to a `com_users` row, on create or update. */
export interface UserTableWriteRow {
  com_name: string | null;
  com_mobilenumber: string;
  com_email: string;
  com_password: string;
  com_nationalid: string | null;
  com_passportnumber: string | null;
  com_birthdate: string | null; // YYYY-MM-DD
  com_registeredas: number;
  /** Always an Active-state status (Under Review): a deactivated user is never reused, so no statecode is written. */
  statuscode: number;
  com_appnotificationtoken: string;
  /** true → a CRM plugin generates com_otp + its expiry and sends the SMS. */
  com_requestotp: boolean;
  /** false → the mobile must be verified again (sent with every new OTP) · missing → left as it is */
  com_mobileverified?: boolean;
}
