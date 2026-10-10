/** The temp file is not there any more (deleted, lost on a redeploy, or a wrong id), so trying again cannot help. */
export class TempFileMissingException extends Error {
  constructor(
    readonly tempFileId: string,
    options?: ErrorOptions,
  ) {
    super(`Temp file ${tempFileId} not found`, options);
    this.name = 'TempFileMissingException';
  }
}
