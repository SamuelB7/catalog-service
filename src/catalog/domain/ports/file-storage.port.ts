export const FILE_STORAGE = Symbol('FILE_STORAGE');

export type StoredFile = {
  url: string;
  fileReference: string;
};

export type UploadFileInput = {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
};

export interface FileStoragePort {
  upload(input: UploadFileInput): Promise<StoredFile>;
}
