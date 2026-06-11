import { Inject, Injectable } from '@nestjs/common';
import { listingUpdatedEvent } from '../../domain/catalog-events';
import {
  CATALOG_REPOSITORY,
  CatalogActor,
  CatalogRepository,
  ListingVariantInput,
  ListingVariantPatch,
  ListingVariantView
} from '../../domain/ports/catalog.repository';
import { CatalogAccessService } from '../catalog-access.service';
import { catalogError } from '../catalog.errors';

@Injectable()
export class ManageVariantsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository,
    private readonly access: CatalogAccessService
  ) {}

  async add(actor: CatalogActor, listingId: string, variant: ListingVariantInput): Promise<ListingVariantView> {
    const seller = await this.access.requireActiveSeller(actor);
    const created = await this.catalogRepository.addVariant({
      sellerId: seller.sellerId,
      listingId,
      variant,
      outboxEvent: listingUpdatedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!created) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return created;
  }

  async update(actor: CatalogActor, listingId: string, variantId: string, patch: ListingVariantPatch): Promise<ListingVariantView> {
    const seller = await this.access.requireActiveSeller(actor);
    const variant = await this.catalogRepository.updateVariant({
      sellerId: seller.sellerId,
      listingId,
      variantId,
      patch,
      outboxEvent: listingUpdatedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!variant) {
      throw catalogError('VARIANT_NOT_FOUND', 'Variant not found.');
    }

    return variant;
  }

  async delete(actor: CatalogActor, listingId: string, variantId: string): Promise<{ removed: true }> {
    const seller = await this.access.requireActiveSeller(actor);
    const removed = await this.catalogRepository.deleteVariant({
      sellerId: seller.sellerId,
      listingId,
      variantId,
      outboxEvent: listingUpdatedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!removed) {
      throw catalogError('VARIANT_NOT_FOUND', 'Variant not found.');
    }

    return { removed: true };
  }
}
