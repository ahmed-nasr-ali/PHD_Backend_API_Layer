/**
 * The JSON returned by `GET /files/settings` and `POST /files/settings/refresh`:
 * the SharePoint settings the API is using right now, so we can check them against the CRM screen.
 * It includes the flow URLs (secrets): this endpoint is for us only, never for the app.
 */
export interface SharePointSettingsResponseDto {
  // General
  uploadFlowUrl: string;
  readFlowUrl: string;
  deleteFlowUrl: string;
  siteAddress: string;
  // Routing Config
  userFolderPath: string;
  unitFolderPath: string;
  vehicleFolderPath: string;
  gatePassFolderPath: string;
  salesLaunchContentFolderPath: string;
  invitationFolderPath: string;
  privacyFolderPath: string;
  sendUsMessageFolderPath: string;
  commercialEntityFolderPath: string;
  compoundFolderPath: string;
}
