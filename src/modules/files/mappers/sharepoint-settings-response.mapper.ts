import { FileCategory } from '../../../core/storage';
import type { SharePointSettings } from '../../../core/storage/sharepoint/settings';
import type { SharePointSettingsResponseDto } from '../dto/responses/sharepoint-settings-response.dto';

/** Turns the settings the API holds into the settings response, field by field (the response never depends on the model's shape). */
export class SharePointSettingsResponseMapper {
  static toResponse(
    settings: SharePointSettings,
  ): SharePointSettingsResponseDto {
    return {
      uploadFlowUrl: settings.uploadFlowUrl,
      readFlowUrl: settings.readFlowUrl,
      deleteFlowUrl: settings.deleteFlowUrl,
      siteAddress: settings.siteAddress,
      userFolderPath: settings.folders[FileCategory.User],
      unitFolderPath: settings.folders[FileCategory.Unit],
      vehicleFolderPath: settings.folders[FileCategory.Vehicle],
      gatePassFolderPath: settings.folders[FileCategory.GatePass],
      salesLaunchContentFolderPath:
        settings.folders[FileCategory.SalesLaunchContent],
      invitationFolderPath: settings.folders[FileCategory.Invitation],
      privacyFolderPath: settings.folders[FileCategory.Privacy],
      sendUsMessageFolderPath: settings.folders[FileCategory.SendUsMessage],
      commercialEntityFolderPath:
        settings.folders[FileCategory.CommercialEntity],
      compoundFolderPath: settings.folders[FileCategory.Compound],
    };
  }
}
