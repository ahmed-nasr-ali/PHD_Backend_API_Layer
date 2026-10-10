import { DocumentKind } from '../enums/document-kind.enum';
import {
  DocumentNotExpectedError,
  DocumentsMissingError,
} from '../errors/document.errors';
import { DocumentsUser } from '../models/documents-user.model';

/**
 * Family members (and tenant family members): the ID front and the marriage certificate depend on the user, not on the request,
 * so Zod can't check them (it has no stored data). Both documents are checked before throwing, so one error lists every missing one.
 * 15+ (or no birth date) without idFront → DocumentsMissingError · younger with idFront → DocumentNotExpectedError
 * · spouse without marriageCertificate → DocumentsMissingError · not a spouse with it → DocumentNotExpectedError
 *
 * @param sent the documents in the request
 */
export function ensureFamilyDocuments(
  user: DocumentsUser,
  sent: DocumentKind[],
  today: Date,
): void {
  const needed = new Map<DocumentKind, boolean>([
    [DocumentKind.IdFront, user.mustSendIdFront(today)],
    [DocumentKind.MarriageCertificate, user.isSpouse],
  ]);

  const missing: DocumentKind[] = [];
  const notExpected: DocumentKind[] = [];
  for (const [document, isNeeded] of needed) {
    const isSent = sent.includes(document);
    if (isNeeded && !isSent) {
      missing.push(document);
    }
    if (!isNeeded && isSent) {
      notExpected.push(document);
    }
  }

  if (missing.length > 0) {
    throw new DocumentsMissingError(missing);
  }
  if (notExpected.length > 0) {
    throw new DocumentNotExpectedError(notExpected);
  }
}
