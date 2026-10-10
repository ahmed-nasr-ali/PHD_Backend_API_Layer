import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { SharePointSettingsResponseDto } from '../dto/responses/sharepoint-settings-response.dto';
import { SharePointSettingsResponseMapper } from '../mappers/sharepoint-settings-response.mapper';
import { GetSharePointSettingsService } from '../services/get-sharepoint-settings.service';
import { RefreshSharePointSettingsService } from '../services/refresh-sharepoint-settings.service';

/** Lets us see and reload the SharePoint settings the API uses (for us only, not for the app). */
@Controller('files/settings')
export class FilesSettingsController {
  constructor(
    private readonly getSharePointSettings: GetSharePointSettingsService,
    private readonly refreshSharePointSettings: RefreshSharePointSettingsService,
  ) {}

  /** Shows the settings in use right now. */
  @Get()
  async get(): Promise<SharePointSettingsResponseDto> {
    const settings = await this.getSharePointSettings.execute();
    return SharePointSettingsResponseMapper.toResponse(settings);
  }

  /** Reads the settings from the CRM again and shows them. It creates nothing, so it answers 200 instead of POST's default 201. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(): Promise<SharePointSettingsResponseDto> {
    const settings = await this.refreshSharePointSettings.execute();
    return SharePointSettingsResponseMapper.toResponse(settings);
  }
}
