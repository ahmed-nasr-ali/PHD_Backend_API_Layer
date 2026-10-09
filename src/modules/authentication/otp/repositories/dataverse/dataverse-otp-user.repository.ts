import { Injectable } from '@nestjs/common';
import {
  DataverseClient,
  DataverseException,
} from '../../../../../core/dataverse';
import { OtpUser } from '../../domain/models/otp-user.model';
import { OtpUserRepository } from '../otp-user.repository';
import { OtpUserTableMapper } from './mappers/otp-user.table-mapper';
import { OTP_USER_COLUMNS } from './queries/otp-user.query';
import {
  OTP_USER_TABLE,
  OtpUserMobileVerifiedWriteRow,
  OtpUserRequestOtpWriteRow,
  OtpUserTableRow,
} from './tables/otp-user.table';

@Injectable()
export class DataverseOtpUserRepository extends OtpUserRepository {
  constructor(private readonly dataverse: DataverseClient) {
    super();
  }

  /** found → the user · Dataverse 404 → null · any other error → rethrown */
  async findById(id: string): Promise<OtpUser | null> {
    try {
      const row = await this.dataverse.retrieve<OtpUserTableRow>(
        OTP_USER_TABLE,
        id,
        OTP_USER_COLUMNS,
      );
      return OtpUserTableMapper.toDomain(row);
    } catch (error) {
      if (error instanceof DataverseException && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async markMobileVerified(id: string): Promise<void> {
    const row: OtpUserMobileVerifiedWriteRow = { com_mobileverified: true };
    await this.dataverse.update(OTP_USER_TABLE, id, row);
  }

  /** Same write as the app's resend button (tested on phdtest 2026-10-09). */
  async requestOtp(id: string): Promise<void> {
    const row: OtpUserRequestOtpWriteRow = { com_requestotp: true };
    await this.dataverse.update(OTP_USER_TABLE, id, row);
  }
}
