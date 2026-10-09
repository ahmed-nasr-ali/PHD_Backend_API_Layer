/** Codes the authentication module returns in the error envelope. Part of the API contract: never rename a value. */
export enum AuthenticationErrorCode {
  UserExists = 'USER_EXISTS',
  NotPhdCustomer = 'NOT_PHD_CUSTOMER',
}
