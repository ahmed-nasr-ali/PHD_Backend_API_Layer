import { DocumentsUser } from '../domain/models/documents-user.model';

/**
 * What the services need from user storage (`com_users` + the user's invitation).
 * An abstract class (not an interface) so it can be used as a Nest DI token.
 */
export abstract class DocumentsUserRepository {
  /** found → the user (with the relationship from their invitation, if they were invited) · no such user → null */
  abstract findById(id: string): Promise<DocumentsUser | null>;

  /** The upload failed for good: the CRM team sees Rejected and the user may send the documents again. */
  abstract markRejectedAndAllowForResubmission(id: string): Promise<void>;
}
