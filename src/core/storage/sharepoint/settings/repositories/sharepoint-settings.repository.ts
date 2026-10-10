import type { SharePointSettings } from '../models/sharepoint-settings.model';

/**
 * Reads the SharePoint settings from where they are stored (today: the CRM).
 * It reads every time it is called; keeping them in memory is SharePointSettingsCache's job.
 */
export abstract class SharePointSettingsRepository {
  /** Reads the settings. Every field filled → the settings · one empty → SharePointSettingsMissingException */
  abstract loadSettings(): Promise<SharePointSettings>;
}
