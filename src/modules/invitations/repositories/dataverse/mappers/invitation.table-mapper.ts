import { optionSetValue } from '../../../../core/dataverse';
import { InvitationStatus } from '../../domain/enums/invitation-status.enum';
import { InvitedAs } from '../../domain/enums/invited-as.enum';
import { Relationship } from '../../domain/enums/relationship.enum';
import { InvitationCompound } from '../../domain/models/invitation-compound.model';
import { Invitation } from '../../domain/models/invitation.model';
import { InvitationTableRow } from './tables/invitation.table';

/** Translates a `com_invitationrequests` row into the Invitation domain model. */
export class InvitationTableMapper {
  static toDomain(row: InvitationTableRow): Invitation {
    return Invitation.restore({
      id: row.com_invitationrequestid,
      status: optionSetValue(InvitationStatus, row.statuscode),
      invitedAs: optionSetValue(InvitedAs, row.com_to),
      name: row.com_familymembername,
      mobile: row.com_familymembermobilenumber,
      relationship: optionSetValue(Relationship, row.com_relationship),
      createdOn: new Date(row.createdon),
      compounds: InvitationTableMapper.toCompounds(row),
    });
  }

  /** Units without a unit or compound (empty lookups in the CRM) are skipped. */
  private static toCompounds(row: InvitationTableRow): InvitationCompound[] {
    return row.com_com_invitationrequest_com_invitationunit_InvitationRequest.flatMap(
      (invitationUnit) => {
        const compound = invitationUnit.com_Unit?.com_Compound;
        return compound
          ? [
              {
                id: compound.com_compoundid,
                termsAndConditions:
                  compound.com_tenancytermsandconditionsfortenants,
              },
            ]
          : [];
      },
    );
  }
}
