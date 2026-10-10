/** Codes the documents feature returns in the error envelope. Part of the API contract: never rename a value. */
export enum DocumentErrorCode {
  UserNotFound = 'DOCUMENTS_USER_NOT_FOUND',
  UserDeactivated = 'DOCUMENTS_USER_DEACTIVATED',
  TypeMismatch = 'DOCUMENTS_TYPE_MISMATCH',
  Missing = 'DOCUMENTS_MISSING',
  NotExpected = 'DOCUMENT_NOT_EXPECTED',
}
