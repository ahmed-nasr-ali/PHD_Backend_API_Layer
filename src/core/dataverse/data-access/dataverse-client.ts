import { DataverseQuery } from './dataverse-query';

export abstract class DataverseClient {
  abstract retrieve<T>(
    table: string,
    id: string,
    select?: string[],
  ): Promise<T>;

  abstract retrieveMultiple<T>(
    table: string,
    query?: DataverseQuery,
  ): Promise<T[]>;

  abstract create(table: string, data: object): Promise<string>;

  abstract update(table: string, id: string, data: object): Promise<void>;

  abstract delete(table: string, id: string): Promise<void>;
}
