/**
 * The registration documents a user can send. Each value is also the name of its field in the upload request
 * (e.g. the file sent as `idFront` is DocumentKind.IdFront), so the two can never drift apart.
 */
export enum DocumentKind {
  Selfie = 'selfie',
  IdFront = 'idFront',
  IdBack = 'idBack',
  BirthCertificate = 'birthCertificate',
  MarriageCertificate = 'marriageCertificate',
  ContractFront = 'contractFront',
  ContractBack = 'contractBack',
}
