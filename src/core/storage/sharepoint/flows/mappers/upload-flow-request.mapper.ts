import type { NewAttachment } from '../../../attachments/new-attachment';
import type { SharePointSettings } from '../../settings';
import type { UploadFlowRequest } from '../requests/upload-flow.request';

/** Turns a file to keep into the body the upload flow expects. */
export class UploadFlowRequestMapper {
  static toRequest(
    attachment: NewAttachment,
    settings: SharePointSettings,
  ): UploadFlowRequest {
    return {
      attachmentid: attachment.recordId,
      attachmentname: attachment.name,
      siteaddress: settings.siteAddress,
      folderpath: settings.folders[attachment.category],
      attachmentbody: attachment.content.toString('base64'),
      oldfilepath: attachment.replacesPath ?? '',
      entityname: attachment.table,
      filenamefield: attachment.nameColumn,
      filepathfield: attachment.pathColumn,
    };
  }
}
