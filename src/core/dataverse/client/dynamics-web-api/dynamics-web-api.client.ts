import { Injectable } from '@nestjs/common';
import { DynamicsWebApi, RequestError } from 'dynamics-web-api';
import { DataverseClient } from '../dataverse.client';
import { DataverseQuery } from '../../query/dataverse-query.types';
import { RequestPolicy } from '../../policies/request.policy';
import { DataverseException } from '../../errors/dataverse.exception';

@Injectable()
export class DynamicsWebApiClient extends DataverseClient {
  constructor(
    private readonly api: DynamicsWebApi,
    private readonly requestPolicy: RequestPolicy,
  ) {
    super();
  }

  retrieve<T>(table: string, id: string, select?: string[]): Promise<T> {
    return this.run(() =>
      this.api.retrieve<T>({ collection: table, key: id, select }),
    );
  }

  async retrieveMultiple<T>(
    table: string,
    query?: DataverseQuery,
  ): Promise<T[]> {
    const response = await this.run(() =>
      this.api.retrieveMultiple<T>({ collection: table, ...query }),
    );
    return response.value;
  }

  create(table: string, data: object): Promise<string> {
    return this.run(() =>
      this.api.create<object, string>({ collection: table, data }),
    );
  }

  createAndRetrieve<T>(
    table: string,
    data: object,
    select: string[],
  ): Promise<T> {
    return this.run(() =>
      this.api.create<object, T>({
        collection: table,
        data,
        select,
        returnRepresentation: true,
      }),
    );
  }

  async update(table: string, id: string, data: object): Promise<void> {
    await this.run(() => this.api.update({ collection: table, key: id, data }));
  }

  updateAndRetrieve<T>(
    table: string,
    id: string,
    data: object,
    select: string[],
  ): Promise<T> {
    return this.run(() =>
      this.api.update<object, T>({
        collection: table,
        key: id,
        data,
        select,
        returnRepresentation: true,
      }),
    );
  }

  async delete(table: string, id: string): Promise<void> {
    await this.run(() => this.api.deleteRecord({ collection: table, key: id }));
  }

  private run<R>(send: () => Promise<R>): Promise<R> {
    return this.requestPolicy.execute(() =>
      send().catch((error) => {
        throw toDataverseException(error);
      }),
    );
  }
}

function toDataverseException(error: unknown): DataverseException {
  if (error instanceof DataverseException) return error;

  const { message, status } = (error ?? {}) as Partial<RequestError>;
  return new DataverseException(message ?? 'Dataverse request failed', status, {
    cause: error,
  });
}
