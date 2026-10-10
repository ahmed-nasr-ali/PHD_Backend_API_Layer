import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../authentication/shared/domain/enums/registered-as.enum';
import {
  DocumentsTypeMismatchError,
  DocumentsUserDeactivatedError,
  DocumentsUserNotFoundError,
} from '../../domain/errors/document.errors';
import { DocumentsUser } from '../../domain/models/documents-user.model';
import { DocumentsUserRepository } from '../../repositories/documents-user.repository';

/** Checks that a user may send documents as the type they say they are. */
@Injectable()
export class DocumentsUserVerifier {
  constructor(private readonly users: DocumentsUserRepository) {}

  /**
   * Loads the user and checks them against the request's type.
   * no such user → DocumentsUserNotFoundError · deactivated → DocumentsUserDeactivatedError
   * · the CRM says another type → DocumentsTypeMismatchError · else → the user
   */
  async verify(userId: string, type: RegisteredAs): Promise<DocumentsUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new DocumentsUserNotFoundError(userId);
    }
    if (user.isDeactivated) {
      throw new DocumentsUserDeactivatedError();
    }
    if (user.registeredAs !== type) {
      throw new DocumentsTypeMismatchError(type, user.registeredAs);
    }
    return user;
  }
}
