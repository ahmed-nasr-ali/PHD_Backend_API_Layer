import { InMemoryFileStorage } from '../../src/core/files';
import { describeFileStorageContract } from './file-storage.contract';

describeFileStorageContract('InMemoryFileStorage', async () => new InMemoryFileStorage());
