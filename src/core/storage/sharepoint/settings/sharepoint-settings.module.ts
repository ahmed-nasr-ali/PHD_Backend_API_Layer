import { Module } from '@nestjs/common';
import { DataverseModule } from '../../../dataverse';
import { DataverseSharePointSettingsRepository } from './repositories/dataverse/dataverse-sharepoint-settings.repository';
import { SharePointSettingsRepository } from './repositories/sharepoint-settings.repository';
import { SharePointSettingsCache } from './sharepoint-settings.cache';

/** Wires the SharePoint settings: read from the CRM, kept by the cache. Other modules import it and use SharePointSettingsCache only. */
@Module({
  imports: [DataverseModule],
  providers: [
    { provide: SharePointSettingsRepository, useClass: DataverseSharePointSettingsRepository },
    SharePointSettingsCache,
  ],
  exports: [SharePointSettingsCache],
})
export class SharePointSettingsModule {}
