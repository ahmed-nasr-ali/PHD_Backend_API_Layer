/** The kinds of background jobs the app runs. Each name has exactly one handler, which does its work. */
export enum JobName {
  /** Sends a user's documents to SharePoint and writes their paths on the CRM record (handler: task 7). */
  UploadDocuments = 'upload-documents',
}
