/**
 * Thrown when a SharePoint flow refuses a request or does not answer in time.
 * The message never holds the flow URL (it works like a password).
 */
export class SharePointFlowException extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SharePointFlowException';
  }
}
