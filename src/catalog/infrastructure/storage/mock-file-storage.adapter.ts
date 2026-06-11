import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { FILE_STORAGE, FileStoragePort, StoredFile, UploadFileInput } from '../../domain/ports/file-storage.port';

@Injectable()
export class MockFileStorageAdapter implements FileStoragePort {
  async upload(input: UploadFileInput): Promise<StoredFile> {
    const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, '-');
    const fileReference = `mock/catalog-media/${randomUUID()}/${safeName}`;

    return {
      fileReference,
      url: `mock://${fileReference}`
    };
  }
}

export const fileStorageProvider = {
  provide: FILE_STORAGE,
  useClass: MockFileStorageAdapter
};
