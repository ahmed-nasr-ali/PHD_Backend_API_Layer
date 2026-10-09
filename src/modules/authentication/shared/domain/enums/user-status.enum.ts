/** CRM `com_users.statuscode` (values are the CRM values). */
export enum UserStatus {
  UnderReview = 1,
  Approved = 181410000,
  Rejected = 181410001,
  Deactivated = 2,
}

/** CRM `com_users.statecode`. A status is written together with its state. */
export enum UserState {
  /** Under Review, Approved, Rejected */
  Active = 0,
  /** Deactivated */
  Inactive = 1,
}
