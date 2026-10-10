import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import { DocumentsUser } from '../../../../domain/models/documents-user.model';
import { DocumentsInvitationCloser } from '../../documents-invitation.closer';
import { DocumentsJobScheduler } from '../../documents-job.scheduler';
import { DocumentsUserVerifier } from '../../documents-user.verifier';
import { DocumentsUploadStrategy } from '../documents-upload.strategy';
import type { TenantUploadDocumentsInput } from './tenant-upload-documents.input';

/** Tenant: selfie only (checked by Zod) */
@Injectable()
export class TenantDocumentsUploadStrategy extends DocumentsUploadStrategy {
  readonly type = RegisteredAs.Tenant;

  constructor(
    private readonly userVerifier: DocumentsUserVerifier,
    private readonly jobScheduler: DocumentsJobScheduler,
    private readonly invitationCloser: DocumentsInvitationCloser,
  ) {
    super();
  }

  /** check the user → queue the upload */
  async execute(input: TenantUploadDocumentsInput): Promise<string> {
    await this.userVerifier.verify(input.userId, this.type);
    return this.jobScheduler.schedule(input.userId, input);
  }

  /** every file kept → close the invitation */
  async afterUpload(user: DocumentsUser): Promise<void> {
    await this.invitationCloser.close(user);
  }
}
