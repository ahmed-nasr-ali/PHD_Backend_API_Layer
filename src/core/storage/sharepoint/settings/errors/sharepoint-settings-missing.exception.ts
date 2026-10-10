/**
 * Thrown when a SharePoint setting is empty in the CRM, so files can't be handled until someone fills it.
 * It is a server configuration problem, so the client gets 500.
 * The message names the empty column only, never a value (a flow URL is a secret).
 */
export class SharePointSettingsMissingException extends Error {
  constructor(readonly column: string) {
    super(`SharePoint setting "${column}" is empty in the CRM general settings`);
    this.name = 'SharePointSettingsMissingException';
  }
}
