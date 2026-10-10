import { DocumentKind } from '../../../domain/enums/document-kind.enum';

/** Dataverse table (entity set) that stores app users; register and otp read the same table through their own table files. */
export const DOCUMENTS_USER_TABLE = 'com_users';

/** The `com_users` columns the documents step reads about the user, exactly as the Web API returns them. */
export interface DocumentsUserTableRow {
  com_userid: string;
  com_registeredas: number | null;
  com_birthdate: string | null; // ISO date
  statecode: number | null;
}

/** The `com_users` path columns: filled once the upload flow has kept the file. */
export interface DocumentFilesTableRow {
  com_profilepicturefilepath: string | null;
  com_nationalidfrontpath: string | null;
  com_nationalidbackpath: string | null;
  com_birthcertificatefilepath: string | null;
  com_marriagecertificatepath: string | null;
  com_contractfrontpath: string | null;
  com_contractbackpath: string | null;
}

/** What marking a user Rejected writes: Dataverse accepts a `statuscode` only together with its own `statecode`. */
export interface DocumentsUserStatusWriteRow {
  statecode: number;
  statuscode: number;
}

/**
 * The two `com_users` columns of each document: the upload flow writes the file's name into `name` and its path into `path`.
 * Same columns as the app (create_controller.dart, tenant_auth_controller.dart, family_member_controller.dart).
 */
export const DOCUMENT_COLUMNS: Record<
  DocumentKind,
  { name: string; path: keyof DocumentFilesTableRow }
> = {
  [DocumentKind.Selfie]: {
    name: 'com_profilepicturefilename',
    path: 'com_profilepicturefilepath',
  },
  [DocumentKind.IdFront]: {
    name: 'com_nationalidfrontname',
    path: 'com_nationalidfrontpath',
  },
  [DocumentKind.IdBack]: {
    name: 'com_nationalidbackname',
    path: 'com_nationalidbackpath',
  },
  [DocumentKind.BirthCertificate]: {
    name: 'com_birthcertificatefilename',
    path: 'com_birthcertificatefilepath',
  },
  [DocumentKind.MarriageCertificate]: {
    name: 'com_marriagecertificatename',
    path: 'com_marriagecertificatepath',
  },
  [DocumentKind.ContractFront]: {
    name: 'com_contractfrontname',
    path: 'com_contractfrontpath',
  },
  [DocumentKind.ContractBack]: {
    name: 'com_contractbackname',
    path: 'com_contractbackpath',
  },
};
