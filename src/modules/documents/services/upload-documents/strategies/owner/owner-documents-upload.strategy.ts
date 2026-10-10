import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import { DocumentsJobScheduler } from '../../documents-job.scheduler';
import { DocumentsUserVerifier } from '../../documents-user.verifier';
import { DocumentsUploadStrategy } from '../documents-upload.strategy';
import type { OwnerUploadDocumentsInput } from './owner-upload-documents.input';

/** Owner: selfie + ID front (ID back optional; checked by Zod) · no invitation */
@Injectable()
export class OwnerDocumentsUploadStrategy extends DocumentsUploadStrategy {
  readonly type = RegisteredAs.Owner;

  constructor(
    private readonly userVerifier: DocumentsUserVerifier,
    private readonly jobScheduler: DocumentsJobScheduler,
  ) {
    super();
  }

  /** check the user → queue the upload */
  async execute(input: OwnerUploadDocumentsInput): Promise<string> {
    await this.userVerifier.verify(input.userId, this.type);
    return this.jobScheduler.schedule(input.userId, input);
  }

  /** Owners have no invitation and keep the status register gave them: nothing else changes. */
  async afterUpload(): Promise<void> {}
}
