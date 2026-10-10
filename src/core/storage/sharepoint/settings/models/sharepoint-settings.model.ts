import type { FileCategory } from '../../../attachments/file-category.enum';

/**
 * The SharePoint settings the API needs to keep files, from the CRM screen General Setting → SharePoint Config.
 * The 3 flow URLs work like passwords (anyone holding one can call the flow): never log them.
 */
export interface SharePointSettings {
  // General
  uploadFlowUrl: string;
  readFlowUrl: string;
  deleteFlowUrl: string;
  /** e.g. https://phdint.sharepoint.com/teams/CRMCaseManagement */
  siteAddress: string;
  /** Routing Config: the folder each kind of file goes to, e.g. FileCategory.User → /Sandbox Attachments/Community App/User Attachments */
  folders: Record<FileCategory, string>;
}
