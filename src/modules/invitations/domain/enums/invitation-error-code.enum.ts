/** Codes the invitations feature returns in the error envelope. Part of the API contract: never rename a value. */
export enum InvitationErrorCode {
  NotFound = 'INVITATION_NOT_FOUND',
  Invalid = 'INVITATION_INVALID',
  AlreadyUsed = 'INVITATION_ALREADY_USED',
  RoleNotSupported = 'INVITATION_ROLE_NOT_SUPPORTED',
  RoleMismatch = 'INVITATION_ROLE_MISMATCH',
}
