import type { SharePointSettingsTableRow } from '../tables/sharepoint-settings.table';

/**
 * The columns the API asks the CRM for ($select).
 * Only these: the same table also holds secrets we don't need (e.g. the storage account key).
 */
export const SHAREPOINT_SETTINGS_COLUMNS: (keyof SharePointSettingsTableRow)[] = [
  'com_sharepointattachmentcreationendpointurl',
  'com_sharepointattachmentretrievingendpointurl',
  'com_sharepointattachmentdeletionendpointurl',
  'com_sharepointsiteaddress',
  'com_userattachmentsfolderpath',
  'com_unitattachmentsfolderpath',
  'com_vehicleattachmentsfolderpath',
  'com_gatepassattachmentsfolderpath',
  'com_saleslaunchcontentattachmentsfolderpath',
  'com_invitationunitattachmentsfolderpath',
  'com_privacyattachmentsfolderpath',
  'com_sendusamessagefolderpath',
  'com_commercialentityfolderpath',
  'com_compoundattachmentsfolderpath',
];
