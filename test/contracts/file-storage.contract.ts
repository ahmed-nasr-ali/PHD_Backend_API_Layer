import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  StorageFolder,
  type FileStorage,
  type FileUpload,
  type StorageKey,
  type StoredFile,
} from '../../src/core/files';

/**
 * One suite every FileStorage adapter must pass: in-memory today, the flows and Graph later.
 * Real stores only against a test site, never production. Every file it uploads is deleted after each test.
 */
export function describeFileStorageContract(
  name: string,
  makeStorage: () => Promise<FileStorage>,
): void {
  describe(`${name} satisfies FileStorage`, () => {
    let storage: FileStorage;
    let saved: StorageKey[];

    beforeEach(async () => {
      storage = await makeStorage();
      saved = [];
    });

    afterEach(async () => {
      for (const key of saved) {
        await storage.delete(key);
      }
    });

    const fileOf = (text: string, fileName = `${randomUUID()}.txt`): FileUpload => ({
      folder: StorageFolder.UserDocuments,
      name: fileName,
      contentType: 'text/plain',
      content: Buffer.from(text),
    });

    const upload = async (file: FileUpload): Promise<StoredFile> => {
      const stored = await storage.upload(file);
      saved.push(stored.key);
      return stored;
    };

    const textOf = async (key: StorageKey): Promise<string | null> => {
      const content = await storage.open(key);
      return content ? (await readAll(content.stream)).toString() : null;
    };

    it('returns null for a missing file', async () => {
      const missing = (await upload(fileOf('x'))).key;
      await storage.delete(missing);

      expect(await storage.describe(missing)).toBeNull();
      expect(await storage.open(missing)).toBeNull();
    });

    it('describes an uploaded file', async () => {
      const file = fileOf('hello');
      const stored = await upload(file);

      expect(await storage.describe(stored.key)).toMatchObject({
        key: stored.key,
        contentType: 'text/plain',
        size: 5,
      });
      expect(stored.version).not.toBe('');
    });

    it('opens an uploaded file with the same bytes', async () => {
      const stored = await upload(fileOf('hello'));

      expect(await textOf(stored.key)).toBe('hello');
    });

    it('never overwrites: the same name twice → two keys, the first unchanged', async () => {
      const fileName = `${randomUUID()}.txt`;
      const first = await upload(fileOf('first', fileName));
      const second = await upload(fileOf('second', fileName));

      expect(second.key).not.toBe(first.key);
      expect(await textOf(first.key)).toBe('first');
      expect(await textOf(second.key)).toBe('second');
    });

    it('replaces: new content, new version, the old key gone if it changed', async () => {
      const old = await upload(fileOf('old'));
      const replaced = await storage.replace(old.key, fileOf('new'));
      saved.push(replaced.key);

      expect(await textOf(replaced.key)).toBe('new');
      expect(replaced.version).not.toBe(old.version);
      if (replaced.key !== old.key) {
        expect(await storage.describe(old.key)).toBeNull();
      }
    });

    it('replace on a missing key → just saves the file', async () => {
      const missing = (await upload(fileOf('x'))).key;
      await storage.delete(missing);

      const stored = await storage.replace(missing, fileOf('new'));
      saved.push(stored.key);

      expect(await textOf(stored.key)).toBe('new');
    });

    it('deletes a file', async () => {
      const stored = await upload(fileOf('bye'));
      await storage.delete(stored.key);

      expect(await storage.describe(stored.key)).toBeNull();
    });

    it('delete twice → no error', async () => {
      const stored = await upload(fileOf('bye'));
      await storage.delete(stored.key);

      await expect(storage.delete(stored.key)).resolves.toBeUndefined();
    });
  });
}

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
