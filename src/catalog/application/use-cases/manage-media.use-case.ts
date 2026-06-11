import { Inject, Injectable } from '@nestjs/common';
import { listingMediaUpdatedEvent } from '../../domain/catalog-events';
import { ListingMediaType } from '../../domain/catalog-types';
import { FILE_STORAGE, FileStoragePort } from '../../domain/ports/file-storage.port';
import {
  CATALOG_REPOSITORY,
  CatalogActor,
  CatalogRepository,
  ListingMediaPatch,
  ListingMediaView
} from '../../domain/ports/catalog.repository';
import { CatalogAccessService } from '../catalog-access.service';
import { catalogError } from '../catalog.errors';

type UploadMediaInput = {
  mediaType: ListingMediaType;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  file?: Express.Multer.File;
};

@Injectable()
export class ManageMediaUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
    private readonly access: CatalogAccessService
  ) {}

  async upload(actor: CatalogActor, listingId: string, input: UploadMediaInput): Promise<ListingMediaView> {
    const seller = await this.access.requireActiveSeller(actor);
    await this.access.requireSellerListing(seller.sellerId, listingId);

    if (!input.file) {
      throw catalogError('UPLOAD_FILE_REQUIRED', 'Upload file is required.');
    }

    const stored = await this.fileStorage.upload({
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      buffer: input.file.buffer
    });

    const media = await this.catalogRepository.addMedia({
      sellerId: seller.sellerId,
      listingId,
      media: {
        mediaType: input.mediaType,
        url: stored.url,
        fileReference: stored.fileReference,
        altText: input.altText,
        sortOrder: input.sortOrder,
        isPrimary: input.isPrimary
      },
      outboxEvent: listingMediaUpdatedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!media) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return media;
  }

  async list(actor: CatalogActor, listingId: string): Promise<ListingMediaView[]> {
    const seller = await this.access.requireActiveSeller(actor);
    const media = await this.catalogRepository.listMedia({ sellerId: seller.sellerId, listingId });

    if (!media) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return media;
  }

  async update(actor: CatalogActor, listingId: string, mediaId: string, patch: ListingMediaPatch): Promise<ListingMediaView> {
    const seller = await this.access.requireActiveSeller(actor);
    const media = await this.catalogRepository.updateMedia({
      sellerId: seller.sellerId,
      listingId,
      mediaId,
      patch,
      outboxEvent: listingMediaUpdatedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!media) {
      throw catalogError('MEDIA_NOT_FOUND', 'Media not found.');
    }

    return media;
  }

  async delete(actor: CatalogActor, listingId: string, mediaId: string): Promise<{ removed: true }> {
    const seller = await this.access.requireActiveSeller(actor);
    const removed = await this.catalogRepository.deleteMedia({
      sellerId: seller.sellerId,
      listingId,
      mediaId,
      outboxEvent: listingMediaUpdatedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!removed) {
      throw catalogError('MEDIA_NOT_FOUND', 'Media not found.');
    }

    return { removed: true };
  }

  async setPrimary(actor: CatalogActor, listingId: string, mediaId: string): Promise<ListingMediaView> {
    const seller = await this.access.requireActiveSeller(actor);
    const media = await this.catalogRepository.setPrimaryMedia({
      sellerId: seller.sellerId,
      listingId,
      mediaId,
      outboxEvent: listingMediaUpdatedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!media) {
      throw catalogError('MEDIA_NOT_FOUND', 'Media not found.');
    }

    return media;
  }
}
