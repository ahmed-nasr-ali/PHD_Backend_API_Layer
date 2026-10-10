import { Injectable } from '@nestjs/common';
import {
  SharePointSettingsCache,
  type SharePointSettings,
} from '../../../core/storage/sharepoint/settings';

/** Gives the SharePoint settings the API is using right now (from memory; the CRM is asked only if they were never loaded). */
@Injectable()
export class GetSharePointSettingsService {
  constructor(private readonly settingsCache: SharePointSettingsCache) {}

  async execute(): Promise<SharePointSettings> {
    return this.settingsCache.getSettings();
  }
}
