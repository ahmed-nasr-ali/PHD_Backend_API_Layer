import { Injectable } from '@nestjs/common';
import { User } from '../domain/models/user.model';
import type { RegisterInput } from './register.input';
import { RegistrationStrategyFactory } from './register/strategies/registration-strategy.factory';

@Injectable()
export class RegisterService {
  constructor(private readonly strategies: RegistrationStrategyFactory) {}

  /** Picks the strategy for the input's type and lets it register the user; returns the saved user. */
  async execute(input: RegisterInput): Promise<User> {
    const strategy = this.strategies.for(input);
    return strategy.execute(input);
  }
}
