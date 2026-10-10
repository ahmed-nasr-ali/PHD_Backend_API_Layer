import type { Readable } from 'node:stream';

/**
 * Keeps uploaded files for a short time, between the request that receives them and the job that sends them on.
 * Features use only this class, so the place behind it (local disk today, Azure Blob later) can change without touching them.
 */
export abstract class TempFileStore {
  /**
   * Writes the file piece by piece (never whole in memory) and gives back a new id to find it later.
   * Written → the id · writing failed → throws and nothing is left behind
   */
  abstract save(content: Readable): Promise<string>;

  /**
   * Gives back the file kept under this id.
   * Found → its bytes · not found (deleted, lost on a redeploy, or a wrong id) → TempFileMissingException
   */
  abstract read(tempFileId: string): Promise<Buffer>;

  /**
   * Removes the file once it is no longer needed.
   * Found → removed · already gone → nothing happens (deleting twice is safe) · an id save() never gave out → TempFileMissingException
   */
  abstract delete(tempFileId: string): Promise<void>;
}
