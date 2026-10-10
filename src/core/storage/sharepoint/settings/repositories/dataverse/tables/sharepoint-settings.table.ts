/** The CRM table that holds the general settings; the API reads its SharePoint fields only. */
export const SHAREPOINT_SETTINGS_TABLE = 'blser_generalsettings';

/** The SharePoint columns of `blser_generalsettings`, exactly as the CRM returns them (any of them can be null). */
export interface SharePointSettingsTableRow {
  // General
  com_sharepointattachmentcreationendpointurl: string | null;
  com_sharepointattachmentretrievingendpointurl: string | null;
  com_sharepointattachmentdeletionendpointurl: string | null;
  com_sharepointsiteaddress: string | null;
  // Routing Config
  com_userattachmentsfolderpath: string | null;
  com_unitattachmentsfolderpath: string | null;
  com_vehicleattachmentsfolderpath: string | null;
  com_gatepassattachmentsfolderpath: string | null;
  com_saleslaunchcontentattachmentsfolderpath: string | null;
  com_invitationunitattachmentsfolderpath: string | null;
  com_privacyattachmentsfolderpath: string | null;
  com_sendusamessagefolderpath: string | null;
  com_commercialentityfolderpath: string | null;
  com_compoundattachmentsfolderpath: string | null;
}
