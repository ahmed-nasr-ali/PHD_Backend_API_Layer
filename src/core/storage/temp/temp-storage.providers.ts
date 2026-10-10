import { resolve } from 'node:path';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TempFilesConfig } from './config/temp-files.config';

/**
 * Reads TEMP_FILES_DIR and turns it into a full path, so a relative value (./tmp/uploads) always means the same folder.
 * Set → the config · missing → the server does not start (same as DV_URL)
 */
export const tempFilesConfigProvider: Provider = {
  provide: TempFilesConfig,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new TempFilesConfig({
      folder: resolve(config.getOrThrow<string>('TEMP_FILES_DIR')),
    }),
};
