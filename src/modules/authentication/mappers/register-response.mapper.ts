import { User } from '../domain/models/user.model';
import { RegisterResponseDto } from '../dto/register-response.dto';

/** Translates the saved user into the `register` response. */
export class RegisterResponseMapper {
  static toResponse(user: User): RegisterResponseDto {
    return {
      userId: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      registeredAs: user.registeredAs,
      status: user.status,
      identity: user.identity
        ? { kind: user.identity.kind, number: user.identity.number }
        : null,
      birthDate: user.birthDate
        ? user.birthDate.toISOString().slice(0, 10)
        : null,
    };
  }
}
