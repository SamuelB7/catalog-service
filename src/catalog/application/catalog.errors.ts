export type CatalogErrorCode =
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_INACTIVE'
  | 'SELLER_NOT_ACTIVE'
  | 'LISTING_NOT_FOUND'
  | 'VARIANT_NOT_FOUND'
  | 'MEDIA_NOT_FOUND'
  | 'UPLOAD_FILE_REQUIRED'
  | 'BULK_IMPORT_EMPTY';

export class CatalogError extends Error {
  constructor(
    readonly code: CatalogErrorCode,
    message: string
  ) {
    super(message);
  }
}

export const catalogError = (code: CatalogErrorCode, message: string) => new CatalogError(code, message);
