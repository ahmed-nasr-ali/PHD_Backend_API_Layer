import { Injectable } from '@nestjs/common';
import {
  DataverseClient,
  DataverseException,
} from '../../../../core/dataverse';
import { AttachmentStorage, FileCategory } from '../../../../core/storage';
import { DocumentFile } from '../../domain/models/document-file';
import { StoredDocument } from '../../domain/models/stored-document';
import { DocumentFileRepository } from '../document-file.repository';
import { DocumentsUserTableMapper } from './mappers/documents-user.table-mapper';
import { DOCUMENT_PATH_COLUMNS } from './queries/documents-user.query';
import {
  DOCUMENT_COLUMNS,
  DOCUMENTS_USER_TABLE,
  DocumentFilesTableRow,
} from './tables/documents-user.table';

/**
 * Keeps document files through AttachmentStorage (today: the SharePoint upload flow, which also writes the name + path columns),
 * and reads those path columns back. The CRM column names stay here, so services never see them.
 */
@Injectable()
export class DataverseDocumentFileRepository extends DocumentFileRepository {
  constructor(
    private readonly dataverse: DataverseClient,
    private readonly attachments: AttachmentStorage,
  ) {
    super();
  }

  async save(userId: string, file: DocumentFile): Promise<void> {
    const columns = DOCUMENT_COLUMNS[file.kind];
    await this.attachments.save({
      recordId: userId,
      name: file.fileName,
      category: FileCategory.User,
      content: file.content,
      replacesPath: file.replacesPath ?? undefined,
      table: DOCUMENTS_USER_TABLE,
      nameColumn: columns.name,
      pathColumn: columns.path,
    });
  }

  /** found → the documents with a path · Dataverse 404 → empty · any other error → rethrown */
  async findStored(userId: string): Promise<StoredDocument[]> {
    try {
      const row = await this.dataverse.retrieve<DocumentFilesTableRow>(
        DOCUMENTS_USER_TABLE,
        userId,
        DOCUMENT_PATH_COLUMNS,
      );
      return DocumentsUserTableMapper.toStoredDocuments(row);
    } catch (error) {
      if (error instanceof DataverseException && error.status === 404) {
        return [];
      }
      throw error;
    }
  }
}
