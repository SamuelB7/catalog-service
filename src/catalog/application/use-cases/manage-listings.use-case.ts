import { Inject, Injectable } from '@nestjs/common';
import { listingCreatedEvent, listingUpdatedEvent } from '../../domain/catalog-events';
import { CATALOG_REPOSITORY, CatalogActor, CatalogRepository, ListingInput, ListingPatch, ListingView } from '../../domain/ports/catalog.repository';
import { catalogError } from '../catalog.errors';
import { CatalogAccessService } from '../catalog-access.service';

@Injectable()
export class ManageListingsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository,
    private readonly access: CatalogAccessService
  ) {}

  async create(actor: CatalogActor, listing: ListingInput): Promise<ListingView> {
    const seller = await this.access.requireActiveSeller(actor);
    await this.access.requireActiveCategory(listing.categoryId);

    return this.catalogRepository.createListing({
      sellerId: seller.sellerId,
      listing,
      outboxEvent: listingCreatedEvent({ sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });
  }

  async listMine(actor: CatalogActor): Promise<ListingView[]> {
    const seller = await this.access.requireActiveSeller(actor);
    return this.catalogRepository.listSellerListings(seller.sellerId);
  }

  async getMine(actor: CatalogActor, listingId: string): Promise<ListingView> {
    const seller = await this.access.requireActiveSeller(actor);
    return this.access.requireSellerListing(seller.sellerId, listingId);
  }

  async update(actor: CatalogActor, listingId: string, patch: ListingPatch): Promise<ListingView> {
    const seller = await this.access.requireActiveSeller(actor);

    if (patch.categoryId) {
      await this.access.requireActiveCategory(patch.categoryId);
    }

    const listing = await this.catalogRepository.updateListing({
      sellerId: seller.sellerId,
      listingId,
      patch,
      outboxEvent: listingUpdatedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!listing) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return listing;
  }
}
