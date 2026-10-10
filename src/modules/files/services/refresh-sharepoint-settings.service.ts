import { Injectable } from '@nestjs/common';
import {
  SharePointSettingsCache,
  type SharePointSettings,
} from '../../../core/storage/sharepoint/settings';

/**
 * Reads the SharePoint settings from the CRM again, after the CRM team edits them, without restarting the server.
 * Read worked → the new settings are used from now on · read failed → the error is returned and the old settings stay in use
 */
@Injectable()
export class RefreshSharePointSettingsService {
  constructor(private readonly settingsCache: SharePointSettingsCache) {}

  async execute(): Promise<SharePointSettings> {
    return this.settingsCache.refresh();
  }
}
