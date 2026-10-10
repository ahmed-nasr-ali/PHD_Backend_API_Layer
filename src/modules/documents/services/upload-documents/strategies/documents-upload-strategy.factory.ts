import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../../authentication/shared/domain/enums/registered-as.enum';
import type { UploadDocumentsInput } from '../../upload-documents.input';
import { DocumentsUploadStrategy } from './documents-upload.strategy';
import { FamilyMemberDocumentsUploadStrategy } from './family-member/family-member-documents-upload.strategy';
import { OwnerDocumentsUploadStrategy } from './owner/owner-documents-upload.strategy';
import { RefOwnerDocumentsUploadStrategy } from './ref-owner/ref-owner-documents-upload.strategy';
import { RefDocumentsUploadStrategy } from './ref/ref-documents-upload.strategy';
import { TenantFamilyMemberDocumentsUploadStrategy } from './tenant-family-member/tenant-family-member-documents-upload.strategy';
import { TenantDocumentsUploadStrategy } from './tenant/tenant-documents-upload.strategy';

/** Gives the documents-upload strategy for a user type. */
@Injectable()
export class DocumentsUploadStrategyFactory {
  /** One strategy per accepted type: a type without a strategy fails `tsc`, so `for()` never misses at runtime. */
  private readonly strategies: Record<
    UploadDocumentsInput['type'],
    DocumentsUploadStrategy
  >;

  constructor(
    owner: OwnerDocumentsUploadStrategy,
    familyMember: FamilyMemberDocumentsUploadStrategy,
    tenantFamilyMember: TenantFamilyMemberDocumentsUploadStrategy,
    tenant: TenantDocumentsUploadStrategy,
    ref: RefDocumentsUploadStrategy,
    refOwner: RefOwnerDocumentsUploadStrategy,
  ) {
    this.strategies = {
      [RegisteredAs.Owner]: owner,
      [RegisteredAs.FamilyMember]: familyMember,
      [RegisteredAs.TenantFamilyMember]: tenantFamilyMember,
      [RegisteredAs.Tenant]: tenant,
      [RegisteredAs.Ref]: ref,
      [RegisteredAs.RefOwner]: refOwner,
    };
  }

  /** input → the strategy for its type (always one: checked by the compiler, see `strategies`) */
  for(input: UploadDocumentsInput): DocumentsUploadStrategy {
    return this.strategies[input.type];
  }
}
