import type { NewAttachment } from './new-attachment';

/**
 * Where the app keeps uploaded files. Features use only this class, so the store behind it
 * (SharePoint through the flows today, Graph or Blob later) can change without touching them.
 */
export abstract class AttachmentStorage {
  /**
   * Keeps the file and writes its name and path on its CRM record.
   * Kept → resolves · the store refused it or did not answer → throws (the caller may try again)
   */
  abstract save(attachment: NewAttachment): Promise<void>;
}
