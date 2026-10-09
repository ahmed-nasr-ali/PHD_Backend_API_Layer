import { UserTableRow } from '../tables/user.table';

/** User columns to read ($select). */
export const USER_COLUMNS: (keyof UserTableRow)[] = [
  'com_userid',
  'com_name',
  'com_mobilenumber',
  'com_email',
  'com_nationalid',
  'com_passportnumber',
  'com_birthdate',
  'com_registeredas',
  'statuscode',
  'com_profilepicturefilepath',
];
