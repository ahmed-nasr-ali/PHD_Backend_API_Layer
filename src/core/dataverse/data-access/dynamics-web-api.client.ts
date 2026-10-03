import { Injectable } from '@nestjs/common';
import { DynamicsWebApi, RequestError } from 'dynamics-web-api';
import { DataverseClient } from './dataverse-client';
import { DataverseQuery } from './dataverse-query';
import { DataverseRetryPolicy } from '../policies/dataverse-retry-policy';
import { DataverseException } from '../errors/dataverse.exception';

@Injectable()
export class DynamicsWebApiClient extends DataverseClient {
  constructor(
    private readonly api: DynamicsWebApi,
    private readonly retryPolicy: DataverseRetryPolicy,
  ) {
    super();
  }

  retrieve<T>(table: string, id: string, select?: string[]): Promise<T> {
    return this.run((token) =>
      this.api.retrieve<T>({ collection: table, key: id, select, token }),
    );
  }

  async retrieveMultiple<T>(
    table: string,
    query?: DataverseQuery,
  ): Promise<T[]> {
    const response = await this.run((token) =>
      this.api.retrieveMultiple<T>({ collection: table, ...query, token }),
    );
    return response.value;
  }

  create(table: string, data: object): Promise<string> {
    return this.run((token) =>
      this.api.create<object, string>({ collection: table, data, token }),
    );
  }

  async update(table: string, id: string, data: object): Promise<void> {
    await this.run((token) =>
      this.api.update({ collection: table, key: id, data, token }),
    );
  }

  async delete(table: string, id: string): Promise<void> {
    await this.run((token) =>
      this.api.deleteRecord({ collection: table, key: id, token }),
    );
  }

  private run<R>(send: (token?: string) => Promise<R>): Promise<R> {
    return this.retryPolicy.execute(async (token) => {
      try {
        return await send(token);
      } catch (error) {
        throw this.toDataverseException(error);
      }
    });
  }

  private toDataverseException(error: unknown): DataverseException {
    if (error instanceof DataverseException) {
      return error;
    }

    const requestError = error as Partial<RequestError> | undefined;
    return new DataverseException(
      requestError?.message ?? 'Dataverse request failed',
      requestError?.status,
      { cause: error },
    );
  }
}
