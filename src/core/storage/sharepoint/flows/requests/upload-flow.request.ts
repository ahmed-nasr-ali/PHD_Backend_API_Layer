/** The body the upload flow expects, exactly as the mobile app sends it today (share_point_repository.dart). */
export interface UploadFlowRequest {
  attachmentid: string;
  attachmentname: string;
  siteaddress: string;
  folderpath: string;
  /** The file in base64. */
  attachmentbody: string;
  /** The file to remove after the upload; empty → nothing removed. */
  oldfilepath: string;
  entityname: string;
  filenamefield: string;
  filepathfield: string;
}
