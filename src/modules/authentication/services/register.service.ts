import { Injectable } from '@nestjs/common';
import { User } from '../domain/models/user.model';
import { RegisterDto } from '../dto/register.dto';
import { RegistrationStrategyFactory } from './register/registration-strategy.factory';

@Injectable()
export class RegisterService {
  constructor(private readonly strategies: RegistrationStrategyFactory) {}

  /** Picks the strategy for the form's type and lets it register the user; returns the saved user. */
  async execute(body: RegisterDto): Promise<User> {
    const strategy = this.strategies.for(body.type);
    return strategy.execute(body);
  }
}
