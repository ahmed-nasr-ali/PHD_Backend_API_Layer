import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DataverseModule } from '../../core/dataverse';
import { JobQueueModule } from '../../core/jobs';
import {
  StorageModule,
  TempFileStore,
  TempStorageModule,
} from '../../core/storage';
import { FilesToBodyInterceptor, TempFileStorageEngine } from '../../core/uploads';
import { InvitationsModule } from '../invitations/invitations.module';
import { DocumentsController } from './controllers/documents.controller';
import { DataverseDocumentFileRepository } from './repositories/dataverse/dataverse-document-file.repository';
import { DataverseDocumentsUserRepository } from './repositories/dataverse/dataverse-documents-user.repository';
import { DocumentFileRepository } from './repositories/document-file.repository';
import { DocumentsUserRepository } from './repositories/documents-user.repository';
import { UploadDocumentsService } from './services/upload-documents.service';
import { DocumentsInvitationCloser } from './services/upload-documents/documents-invitation.closer';
import { DocumentsJobScheduler } from './services/upload-documents/documents-job.scheduler';
import { DocumentsUserVerifier } from './services/upload-documents/documents-user.verifier';
import { DocumentsUploadStrategyFactory } from './services/upload-documents/strategies/documents-upload-strategy.factory';
import { FamilyMemberDocumentsUploadStrategy } from './services/upload-documents/strategies/family-member/family-member-documents-upload.strategy';
import { OwnerDocumentsUploadStrategy } from './services/upload-documents/strategies/owner/owner-documents-upload.strategy';
import { RefOwnerDocumentsUploadStrategy } from './services/upload-documents/strategies/ref-owner/ref-owner-documents-upload.strategy';
import { RefDocumentsUploadStrategy } from './services/upload-documents/strategies/ref/ref-documents-upload.strategy';
import { TenantFamilyMemberDocumentsUploadStrategy } from './services/upload-documents/strategies/tenant-family-member/tenant-family-member-documents-upload.strategy';
import { TenantDocumentsUploadStrategy } from './services/upload-documents/strategies/tenant/tenant-documents-upload.strategy';

/** The largest file any document allows (each field's own limit is checked by its Zod schema). Bigger → multer stops reading it: 413. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** `POST /auth/documents`: everything the documents step needs lives in this folder. */
@Module({
  imports: [
    DataverseModule,
    // InvitationsModule exports InvitationRepository (used by DocumentsInvitationCloser)
    InvitationsModule,
    StorageModule,
    TempStorageModule,
    JobQueueModule,
    // Every file of a request goes straight to the temp store; limits stop a client from sending too much before Zod runs.
    MulterModule.registerAsync({
      imports: [TempStorageModule],
      inject: [TempFileStore],
      useFactory: (tempFiles: TempFileStore) => ({
        storage: new TempFileStorageEngine(tempFiles),
        limits: {
          fileSize: MAX_FILE_BYTES,
          // 7 documents at most (DocumentKind); 2 text fields (type, userId) + room for a few mistakes that Zod reports
          files: 7,
          fields: 5,
          fieldSize: 1024,
        },
      }),
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    UploadDocumentsService,
    DocumentsUploadStrategyFactory,
    FilesToBodyInterceptor,

    // one strategy per user type
    OwnerDocumentsUploadStrategy,
    FamilyMemberDocumentsUploadStrategy,
    TenantFamilyMemberDocumentsUploadStrategy,
    TenantDocumentsUploadStrategy,
    RefDocumentsUploadStrategy,
    RefOwnerDocumentsUploadStrategy,

    // what the strategies use
    DocumentsUserVerifier,
    DocumentsJobScheduler,
    DocumentsInvitationCloser,
    { provide: DocumentsUserRepository, useClass: DataverseDocumentsUserRepository },
    { provide: DocumentFileRepository, useClass: DataverseDocumentFileRepository },
  ],
})
export class DocumentsModule {}
