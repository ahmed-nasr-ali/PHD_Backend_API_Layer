import { Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../../invitations/repositories/invitation.repository';
import { DocumentsUser } from '../../domain/models/documents-user.model';

/** Closes an invited user's invitation once their documents are kept, so its code can't be used again. */
@Injectable()
export class DocumentsInvitationCloser {
  constructor(private readonly invitations: InvitationRepository) {}

  /** linked invitation → Completed · none linked → nothing to close */
  async close(user: DocumentsUser): Promise<void> {
    if (user.invitationId) {
      await this.invitations.complete(user.invitationId);
    }
  }
}
