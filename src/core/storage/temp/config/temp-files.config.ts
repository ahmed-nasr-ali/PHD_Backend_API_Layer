/** Where temp files are kept, read once from .env (TEMP_FILES_DIR). */
export class TempFilesConfig {
  readonly folder: string;

  constructor(values: TempFilesConfig) {
    this.folder = values.folder;
  }
}
