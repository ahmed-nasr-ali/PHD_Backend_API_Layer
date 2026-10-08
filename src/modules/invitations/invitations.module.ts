import { Module } from '@nestjs/common';
import { DataverseModule } from '../../core/dataverse';
import { InvitationsController } from './controllers/invitations.controller';
import { DataverseInvitationRepository } from './repositories/dataverse/dataverse-invitation.repository';
import { InvitationRepository } from './repositories/invitation.repository';
import { CheckInvitationCodeService } from './services/check-invitation-code.service';

@Module({
  imports: [DataverseModule],
  controllers: [InvitationsController],
  providers: [
    CheckInvitationCodeService,
    { provide: InvitationRepository, useClass: DataverseInvitationRepository },
  ],
  exports: [InvitationRepository],
})
export class InvitationsModule {}
