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
