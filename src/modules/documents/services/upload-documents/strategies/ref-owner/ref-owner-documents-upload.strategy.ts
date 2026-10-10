import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import { DocumentsUser } from '../../../../domain/models/documents-user.model';
import { DocumentsInvitationCloser } from '../../documents-invitation.closer';
import { DocumentsJobScheduler } from '../../documents-job.scheduler';
import { DocumentsUserVerifier } from '../../documents-user.verifier';
import { DocumentsUploadStrategy } from '../documents-upload.strategy';
import type { RefOwnerUploadDocumentsInput } from './ref-owner-upload-documents.input';

/** REF owner: selfie + ID front + contract front + contract back, all required (checked by Zod) */
@Injectable()
export class RefOwnerDocumentsUploadStrategy extends DocumentsUploadStrategy {
  readonly type = RegisteredAs.RefOwner;

  constructor(
    private readonly userVerifier: DocumentsUserVerifier,
    private readonly jobScheduler: DocumentsJobScheduler,
    private readonly invitationCloser: DocumentsInvitationCloser,
  ) {
    super();
  }

  /** check the user → queue the upload */
  async execute(input: RefOwnerUploadDocumentsInput): Promise<string> {
    await this.userVerifier.verify(input.userId, this.type);
    return this.jobScheduler.schedule(input.userId, input);
  }

  /** every file kept → close the invitation */
  async afterUpload(user: DocumentsUser): Promise<void> {
    await this.invitationCloser.close(user);
  }
}
