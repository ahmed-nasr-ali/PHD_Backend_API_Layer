import type { DataverseExpand } from '../../../../../core/dataverse';
import { InvitationTableRow } from '../tables/invitation.table';

/** Invitation columns to read ($select). */
export const INVITATION_COLUMNS: (keyof InvitationTableRow)[] = [
  'com_invitationrequestid',
  'statuscode',
  'com_to',
  'com_familymembername',
  'com_familymembermobilenumber',
  'com_relationship',
  'createdon',
];

/**
 * Invitation → its units → unit → compound, for the compound's terms and conditions ($expand).
 * A nested one-to-many expand: Dataverse rejects `top` in the same query.
 */
export const INVITATION_EXPAND: DataverseExpand[] = [
  {
    property: 'com_com_invitationrequest_com_invitationunit_InvitationRequest',
    select: ['com_invitationunitid'],
    expand: [
      {
        property: 'com_Unit',
        select: ['com_unitid'],
        expand: [
          {
            property: 'com_Compound',
            select: [
              'com_compoundid',
              'com_tenancytermsandconditionsfortenants',
            ],
          },
        ],
      },
    ],
  },
];
