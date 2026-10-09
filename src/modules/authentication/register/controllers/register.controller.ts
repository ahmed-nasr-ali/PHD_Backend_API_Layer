import { Body, Controller, Post } from '@nestjs/common';
import { zodBody } from '../../../../core/validation/presets';
import type { RegisterDto } from '../dto/register.dto';
import { registerSchema } from '../dto/register.dto';
import { RegisterResponseDto } from '../dto/register-response.dto';
import { RegisterResponseMapper } from '../mappers/register-response.mapper';
import type { RegisterInput } from '../services/register.input';
import { RegisterService } from '../services/register.service';

@Controller('auth')
export class RegisterController {
  constructor(private readonly register: RegisterService) {}

  /** Creates the user (or completes an unfinished one): 201. */
  @Post('register')
  async registerUser(
    @Body(zodBody(registerSchema)) dto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    // the validated body already has the input's shape (birthDate is a Date); TypeScript checks they match
    const input: RegisterInput = dto;
    const user = await this.register.execute(input);
    return RegisterResponseMapper.toResponse(user);
  }
}
