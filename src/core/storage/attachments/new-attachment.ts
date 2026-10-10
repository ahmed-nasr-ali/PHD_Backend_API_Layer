import type { FileCategory } from './file-category.enum';

/** A file to keep and the CRM record it belongs to. Flat, in the same order as the upload flow's body. */
export interface NewAttachment {
  /** The CRM record the file belongs to (flow: attachmentid). */
  recordId: string;
  /** A simple name such as selfie.jpg (flow: attachmentname); the flow turns it into 20260708063904_selfie_1783492741985.jpg. */
  name: string;
  /** What kind of file it is; the store picks the folder from it (flow: folderpath). */
  category: FileCategory;
  /** The file itself (flow: attachmentbody, in base64). */
  content: Buffer;
  /** The path of the file this one replaces, as kept on the record (flow: oldfilepath). Not set → a first upload. */
  replacesPath?: string;
  /** The CRM table of the record, e.g. com_users (flow: entityname). */
  table: string;
  /** The record's column that receives the file name, e.g. com_profilepicturefilename (flow: filenamefield). */
  nameColumn: string;
  /** The record's column that receives the file path, e.g. com_profilepicturefilepath (flow: filepathfield). */
  pathColumn: string;
}
