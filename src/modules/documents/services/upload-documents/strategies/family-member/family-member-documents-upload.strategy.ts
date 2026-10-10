import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import { DocumentsUser } from '../../../../domain/models/documents-user.model';
import { ensureFamilyDocuments } from '../../../../domain/rules/ensure-family-documents';
import { DocumentsInvitationCloser } from '../../documents-invitation.closer';
import { DocumentsJobScheduler } from '../../documents-job.scheduler';
import { DocumentsUserVerifier } from '../../documents-user.verifier';
import { DocumentsUploadStrategy } from '../documents-upload.strategy';
import type { FamilyMemberUploadDocumentsInput } from './family-member-upload-documents.input';

/** Family member: selfie + birth certificate (Zod) · ID front from 15 · marriage certificate for a spouse (ensureFamilyDocuments) */
@Injectable()
export class FamilyMemberDocumentsUploadStrategy extends DocumentsUploadStrategy {
  readonly type = RegisteredAs.FamilyMember;

  constructor(
    private readonly userVerifier: DocumentsUserVerifier,
    private readonly jobScheduler: DocumentsJobScheduler,
    private readonly invitationCloser: DocumentsInvitationCloser,
  ) {
    super();
  }

  /** check the user → check the ID + marriage certificate against their age and relationship → queue the upload */
  async execute(input: FamilyMemberUploadDocumentsInput): Promise<string> {
    const user = await this.userVerifier.verify(input.userId, this.type);
    ensureFamilyDocuments(user, input, new Date());
    return this.jobScheduler.schedule(input.userId, input);
  }

  /** every file kept → close the invitation */
  async afterUpload(user: DocumentsUser): Promise<void> {
    await this.invitationCloser.close(user);
  }
}
