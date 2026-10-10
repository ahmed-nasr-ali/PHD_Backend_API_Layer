import { Module } from '@nestjs/common';
import { LocalDiskTempFileStore } from './local-disk/local-disk-temp-file-store';
import { TempFileStore } from './temp-file-store';
import { tempFilesConfigProvider } from './temp-storage.providers';

/** Gives features a TempFileStore. Today: this server's disk. Azure Blob later = another useClass here, nothing else. */
@Module({
  providers: [
    tempFilesConfigProvider,
    { provide: TempFileStore, useClass: LocalDiskTempFileStore },
  ],
  exports: [TempFileStore],
})
export class TempStorageModule {}
