import { Injectable } from '@nestjs/common';
import { AttachmentStorage } from '../../attachments/attachment-storage';
import type { NewAttachment } from '../../attachments/new-attachment';
import { SharePointSettingsCache } from '../settings';
import { UploadFlowRequestMapper } from './mappers/upload-flow-request.mapper';
import { PowerAutomateClient } from './power-automate.client';

/**
 * Keeps files in SharePoint through the Power Automate flows set in the CRM settings, the way the mobile app does today.
 * The upload flow also writes the file's name and path on its CRM record.
 */
@Injectable()
export class PowerAutomateAttachmentStorage extends AttachmentStorage {
  constructor(
    private readonly settingsCache: SharePointSettingsCache,
    private readonly flows: PowerAutomateClient,
  ) {
    super();
  }

  /** Sends the file to the upload flow. The flow accepted it → kept · refused or no answer → SharePointFlowException */
  async save(attachment: NewAttachment): Promise<void> {
    const settings = await this.settingsCache.getSettings();
    await this.flows.post(
      settings.uploadFlowUrl,
      UploadFlowRequestMapper.toRequest(attachment, settings),
    );
  }
}
