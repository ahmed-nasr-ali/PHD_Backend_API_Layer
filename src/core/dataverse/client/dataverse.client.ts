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

  /** Creates the record and returns it (the `select` columns) in the same request: `Prefer: return=representation`. */
  abstract createAndRetrieve<T>(
    table: string,
    data: object,
    select: string[],
  ): Promise<T>;

  abstract update(table: string, id: string, data: object): Promise<void>;

  /** Updates the record and returns it (the `select` columns) in the same request: `Prefer: return=representation`. */
  abstract updateAndRetrieve<T>(
    table: string,
    id: string,
    data: object,
    select: string[],
  ): Promise<T>;

  abstract delete(table: string, id: string): Promise<void>;
}
