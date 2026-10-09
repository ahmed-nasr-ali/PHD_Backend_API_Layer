import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { zodBody } from '../../../../core/validation/presets';
import type { ResendOtpDto } from '../dto/resend-otp.dto';
import { resendOtpSchema } from '../dto/resend-otp.dto';
import { ResendOtpResponseDto } from '../dto/resend-otp-response.dto';
import type { VerifyOtpDto } from '../dto/verify-otp.dto';
import { verifyOtpSchema } from '../dto/verify-otp.dto';
import { VerifyOtpResponseDto } from '../dto/verify-otp-response.dto';
import { ResendOtpResponseMapper } from '../mappers/resend-otp-response.mapper';
import { VerifyOtpResponseMapper } from '../mappers/verify-otp-response.mapper';
import { ResendOtpService } from '../services/resend-otp.service';
import type { VerifyOtpInput } from '../services/verify-otp.input';
import { VerifyOtpService } from '../services/verify-otp.service';

@Controller('auth')
export class OtpController {
  constructor(
    private readonly verifyOtp: VerifyOtpService,
    private readonly resendOtp: ResendOtpService,
  ) {}

  /** Verifying only flips a flag, it creates nothing: 200 instead of POST's default 201. */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body(zodBody(verifyOtpSchema)) dto: VerifyOtpDto,
  ): Promise<VerifyOtpResponseDto> {
    const input: VerifyOtpInput = dto;
    const user = await this.verifyOtp.execute(input);
    return VerifyOtpResponseMapper.toResponse(user);
  }

  /** Asks the CRM for a new code; nothing is created here: 200. */
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resend(
    @Body(zodBody(resendOtpSchema)) dto: ResendOtpDto,
  ): Promise<ResendOtpResponseDto> {
    const user = await this.resendOtp.execute(dto.userId);
    return ResendOtpResponseMapper.toResponse(user);
  }
}
