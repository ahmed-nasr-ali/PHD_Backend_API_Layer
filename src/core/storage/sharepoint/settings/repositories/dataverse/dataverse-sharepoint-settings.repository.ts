import { Injectable } from '@nestjs/common';
import { DataverseClient } from '../../../../../dataverse';
import { SharePointSettingsMissingException } from '../../errors/sharepoint-settings-missing.exception';
import type { SharePointSettings } from '../../models/sharepoint-settings.model';
import { SharePointSettingsRepository } from '../sharepoint-settings.repository';
import { SharePointSettingsTableMapper } from './mappers/sharepoint-settings.table-mapper';
import { SHAREPOINT_SETTINGS_COLUMNS } from './queries/sharepoint-settings.query';
import {
  SHAREPOINT_SETTINGS_TABLE,
  type SharePointSettingsTableRow,
} from './tables/sharepoint-settings.table';

/** Reads the SharePoint settings from the CRM general settings record (there is one record). */
@Injectable()
export class DataverseSharePointSettingsRepository extends SharePointSettingsRepository {
  constructor(private readonly dataverse: DataverseClient) {
    super();
  }

  /** Asks the CRM for the settings record. Found → its settings · no record at all → SharePointSettingsMissingException */
  async loadSettings(): Promise<SharePointSettings> {
    const [row] =
      await this.dataverse.retrieveMultiple<SharePointSettingsTableRow>(
        SHAREPOINT_SETTINGS_TABLE,
        { select: SHAREPOINT_SETTINGS_COLUMNS, top: 1 },
      );
    if (!row) {
      throw new SharePointSettingsMissingException(SHAREPOINT_SETTINGS_TABLE);
    }
    return SharePointSettingsTableMapper.toSettings(row);
  }
}
