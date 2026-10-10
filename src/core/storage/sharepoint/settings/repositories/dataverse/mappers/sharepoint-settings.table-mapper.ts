import { FileCategory } from '../../../../../attachments/file-category.enum';
import { SharePointSettingsMissingException } from '../../../errors/sharepoint-settings-missing.exception';
import type { SharePointSettings } from '../../../models/sharepoint-settings.model';
import type { SharePointSettingsTableRow } from '../tables/sharepoint-settings.table';

/** Turns the CRM row into SharePointSettings: renames every column and checks none is empty. */
export class SharePointSettingsTableMapper {
  /**
   * Builds the settings from the row. A new FileCategory fails tsc until its folder line is added here.
   * Every column filled → the settings · one empty → SharePointSettingsMissingException
   */
  static toSettings(row: SharePointSettingsTableRow): SharePointSettings {
    return {
      uploadFlowUrl: this.valueOf(
        row,
        'com_sharepointattachmentcreationendpointurl',
      ),
      readFlowUrl: this.valueOf(
        row,
        'com_sharepointattachmentretrievingendpointurl',
      ),
      deleteFlowUrl: this.valueOf(
        row,
        'com_sharepointattachmentdeletionendpointurl',
      ),
      siteAddress: this.valueOf(row, 'com_sharepointsiteaddress'),
      folders: {
        [FileCategory.User]: this.valueOf(row, 'com_userattachmentsfolderpath'),
        [FileCategory.Unit]: this.valueOf(row, 'com_unitattachmentsfolderpath'),
        [FileCategory.Vehicle]: this.valueOf(
          row,
          'com_vehicleattachmentsfolderpath',
        ),
        [FileCategory.GatePass]: this.valueOf(
          row,
          'com_gatepassattachmentsfolderpath',
        ),
        [FileCategory.SalesLaunchContent]: this.valueOf(
          row,
          'com_saleslaunchcontentattachmentsfolderpath',
        ),
        [FileCategory.Invitation]: this.valueOf(
          row,
          'com_invitationunitattachmentsfolderpath',
        ),
        [FileCategory.Privacy]: this.valueOf(
          row,
          'com_privacyattachmentsfolderpath',
        ),
        [FileCategory.SendUsMessage]: this.valueOf(
          row,
          'com_sendusamessagefolderpath',
        ),
        [FileCategory.CommercialEntity]: this.valueOf(
          row,
          'com_commercialentityfolderpath',
        ),
        [FileCategory.Compound]: this.valueOf(
          row,
          'com_compoundattachmentsfolderpath',
        ),
      },
    };
  }

  /**
   * Reads one column and makes sure it has a value, so an empty setting is caught here and not later during an upload.
   * Has text → the text without outer spaces · null, empty or spaces only → SharePointSettingsMissingException with the column name
   */
  private static valueOf(
    row: SharePointSettingsTableRow,
    column: keyof SharePointSettingsTableRow,
  ): string {
    const value = row[column]?.trim();
    if (!value) {
      throw new SharePointSettingsMissingException(column);
    }
    return value;
  }
}
