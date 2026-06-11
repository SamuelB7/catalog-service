import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CatalogError } from '../../application/catalog.errors';

export function mapCatalogError(error: unknown): never {
  if (error instanceof CatalogError) {
    switch (error.code) {
      case 'CATEGORY_NOT_FOUND':
      case 'LISTING_NOT_FOUND':
      case 'VARIANT_NOT_FOUND':
      case 'MEDIA_NOT_FOUND':
        throw new NotFoundException(error.message);
      case 'SELLER_NOT_ACTIVE':
        throw new ForbiddenException(error.message);
      case 'CATEGORY_INACTIVE':
      case 'UPLOAD_FILE_REQUIRED':
      case 'BULK_IMPORT_EMPTY':
        throw new BadRequestException(error.message);
      default:
        throw new BadRequestException(error.message);
    }
  }

  throw error;
}
