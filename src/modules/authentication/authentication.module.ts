import { Module } from '@nestjs/common';
import { DataverseModule } from '../../core/dataverse';
import { InvitationsModule } from '../invitations/invitations.module';
import { AuthenticationController } from './controllers/authentication.controller';
import { DataversePhdAccountRepository } from './repositories/dataverse/dataverse-phd-account.repository';
import { DataverseUserRepository } from './repositories/dataverse/dataverse-user.repository';
import { PhdAccountRepository } from './repositories/phd-account.repository';
import { UserRepository } from './repositories/user.repository';
import { RegisterService } from './services/register.service';
import { InvitedUserRegistrar } from './services/register/invited-user-registrar';
import { RegistrationInvitationVerifier } from './services/register/registration-invitation.verifier';
import { RegistrationStrategyFactory } from './services/register/registration-strategy.factory';
import { FamilyMemberRegistrationStrategy } from './services/register/strategies/family-member-registration.strategy';
import { OwnerRegistrationStrategy } from './services/register/strategies/owner-registration.strategy';
import { RefOwnerRegistrationStrategy } from './services/register/strategies/ref-owner-registration.strategy';
import { RefRegistrationStrategy } from './services/register/strategies/ref-registration.strategy';
import { TenantFamilyMemberRegistrationStrategy } from './services/register/strategies/tenant-family-member-registration.strategy';
import { TenantRegistrationStrategy } from './services/register/strategies/tenant-registration.strategy';
import { UserRegistrar } from './services/register/user-registrar';

@Module({
  // InvitationsModule exports InvitationRepository (used by RegistrationInvitationVerifier + InvitedUserRegistrar)
  imports: [DataverseModule, InvitationsModule],
  controllers: [AuthenticationController],
  providers: [
    RegisterService,
    RegistrationStrategyFactory,

    // one strategy per user type
    OwnerRegistrationStrategy,
    FamilyMemberRegistrationStrategy,
    TenantFamilyMemberRegistrationStrategy,
    TenantRegistrationStrategy,
    RefRegistrationStrategy,
    RefOwnerRegistrationStrategy,

    // what the strategies use
    RegistrationInvitationVerifier,
    UserRegistrar,
    InvitedUserRegistrar,
    { provide: UserRepository, useClass: DataverseUserRepository },
    { provide: PhdAccountRepository, useClass: DataversePhdAccountRepository },
  ],
})
export class AuthenticationModule {}
