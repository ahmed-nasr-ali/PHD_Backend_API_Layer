import { Module } from '@nestjs/common';
import { AttachmentStorage } from './attachments/attachment-storage';
import { SharePointSettingsModule } from './sharepoint/settings';
import { PowerAutomateAttachmentStorage } from './sharepoint/flows/power-automate-attachment-storage';
import { PowerAutomateClient } from './sharepoint/flows/power-automate.client';

/** Gives features an AttachmentStorage. Today: SharePoint through the flows. Another store = another useClass here, nothing else. */
@Module({
  imports: [SharePointSettingsModule],
  providers: [
    PowerAutomateClient,
    { provide: AttachmentStorage, useClass: PowerAutomateAttachmentStorage },
  ],
  exports: [AttachmentStorage],
})
export class StorageModule {}
