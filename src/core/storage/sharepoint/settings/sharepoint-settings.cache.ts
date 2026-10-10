import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { SharePointSettings } from './models/sharepoint-settings.model';
import { SharePointSettingsRepository } from './repositories/sharepoint-settings.repository';

/**
 * Keeps the SharePoint settings in memory, so the API asks the CRM once instead of on every file.
 * They are read when the server starts and again only when someone calls refresh().
 */
@Injectable()
export class SharePointSettingsCache implements OnApplicationBootstrap {
  private readonly logger = new Logger(SharePointSettingsCache.name);

  /** The last settings read from the CRM (null until the first successful read). */
  private settings: SharePointSettings | null = null;

  /** The CRM read happening right now, if any: callers that arrive meanwhile wait for it instead of starting another one. */
  private loading: Promise<SharePointSettings> | null = null;

  constructor(private readonly repository: SharePointSettingsRepository) {}

  /**
   * Nest calls this once when the server starts: it reads the settings.
   * Read failed (e.g. the CRM is down) → the error is logged and the server still starts; the first getSettings() tries again.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.refresh();
    } catch (error) {
      this.logger.error(
        `SharePoint settings not loaded at startup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Gives the settings to whoever needs them. Already in memory → returned at once · not yet (startup failed) → read from the CRM now */
  async getSettings(): Promise<SharePointSettings> {
    return this.settings ?? this.refresh();
  }

  /**
   * Reads the settings from the CRM again (used after the CRM team edits them).
   * A read already running → wait for that same read · none running → start one
   */
  refresh(): Promise<SharePointSettings> {
    if (!this.loading) {
      this.loading = this.loadAndKeep();
    }
    return this.loading;
  }

  /**
   * Does the actual CRM read and keeps the result.
   * Success → the new settings replace the old · failure → the old settings stay · either way the read is marked as finished
   */
  private async loadAndKeep(): Promise<SharePointSettings> {
    try {
      this.settings = await this.repository.loadSettings();
      return this.settings;
    } finally {
      this.loading = null;
    }
  }
}
