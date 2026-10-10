import { Module } from '@nestjs/common';
import { SharePointSettingsModule } from '../../core/storage/sharepoint/settings';
import { FilesSettingsController } from './controllers/files-settings.controller';
import { GetSharePointSettingsService } from './services/get-sharepoint-settings.service';
import { RefreshSharePointSettingsService } from './services/refresh-sharepoint-settings.service';

/** Endpoints around files that aren't tied to one feature (today: the SharePoint settings). */
@Module({
  imports: [SharePointSettingsModule],
  controllers: [FilesSettingsController],
  providers: [GetSharePointSettingsService, RefreshSharePointSettingsService],
})
export class FilesModule {}
