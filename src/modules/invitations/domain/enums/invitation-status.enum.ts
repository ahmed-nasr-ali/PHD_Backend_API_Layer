/** Invitation status: CRM `statuscode` option set of `com_invitationrequests`. */
export enum InvitationStatus {
  Confirmed = 1,
  Completed = 2,
  Deactivated = 181410000,
  RejectedByOwner = 181410002,
  Requested = 181410003,
  RejectedByCommunityTeam = 181410004,
  UnderReview = 181410005,
  RejectedByUser = 181410006,
}

/** Invitation state: CRM `statecode` of `com_invitationrequests`. A status is written together with its state. */
export enum InvitationState {
  /** Requested, Confirmed, Under Review */
  Active = 0,
  /** Completed, Rejected (by owner / user / community team), Deactivated */
  Inactive = 1,
}
