import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import { DocumentsUser } from '../../../../domain/models/documents-user.model';
import { ensureFamilyDocuments } from '../../../../domain/rules/ensure-family-documents';
import { DocumentsInvitationCloser } from '../../documents-invitation.closer';
import { DocumentsJobScheduler } from '../../documents-job.scheduler';
import { DocumentsUserVerifier } from '../../documents-user.verifier';
import { DocumentsUploadStrategy } from '../documents-upload.strategy';
import type { TenantFamilyMemberUploadDocumentsInput } from './tenant-family-member-upload-documents.input';

/** Tenant family member: same documents as a family member (selfie + birth certificate · ID from 15 · marriage certificate for a spouse) */
@Injectable()
export class TenantFamilyMemberDocumentsUploadStrategy extends DocumentsUploadStrategy {
  readonly type = RegisteredAs.TenantFamilyMember;

  constructor(
    private readonly userVerifier: DocumentsUserVerifier,
    private readonly jobScheduler: DocumentsJobScheduler,
    private readonly invitationCloser: DocumentsInvitationCloser,
  ) {
    super();
  }

  /** check the user → check the ID + marriage certificate against their age and relationship → queue the upload */
  async execute(input: TenantFamilyMemberUploadDocumentsInput): Promise<string> {
    const user = await this.userVerifier.verify(input.userId, this.type);
    ensureFamilyDocuments(user, input, new Date());
    return this.jobScheduler.schedule(input.userId, input);
  }

  /** every file kept → close the invitation */
  async afterUpload(user: DocumentsUser): Promise<void> {
    await this.invitationCloser.close(user);
  }
}
