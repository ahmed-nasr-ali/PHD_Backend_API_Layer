import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { zodBody } from '../../../core/validation/presets';
import type { CheckInvitationCodeDto } from '../dto/requests/check-invitation-code.dto';
import { checkInvitationCodeSchema } from '../dto/requests/check-invitation-code.dto';
import { InvitationCheckResponseDto } from '../dto/responses/invitation-check-response.dto';
import { InvitationCheckResponseMapper } from '../mappers/invitation-check-response.mapper';
import { CheckInvitationCodeService } from '../services/check-invitation-code.service';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly checkInvitationCode: CheckInvitationCodeService,
  ) {}

  /** Checking a code creates nothing, so it answers 200 instead of POST's default 201. */
  @Post('check-code')
  @HttpCode(HttpStatus.OK)
  async checkCode(
    @Body(zodBody(checkInvitationCodeSchema)) dto: CheckInvitationCodeDto,
  ): Promise<InvitationCheckResponseDto> {
    const invitation = await this.checkInvitationCode.execute(dto.code);
    return InvitationCheckResponseMapper.toResponse(invitation);
  }
}
