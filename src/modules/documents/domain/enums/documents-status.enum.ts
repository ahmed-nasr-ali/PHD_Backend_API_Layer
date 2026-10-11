/** Where a user's documents are, as the app sees it. Part of the API contract: never rename a value. */
export enum DocumentsStatus {
  /** Received, still being sent to SharePoint. */
  Processing = 'processing',
  /** Every file is kept. */
  Ready = 'ready',
  /** Sending failed for good: the user must send the documents again. */
  Failed = 'failed',
}
