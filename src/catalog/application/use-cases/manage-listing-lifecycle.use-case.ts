import { Inject, Injectable } from '@nestjs/common';
import { listingLifecycleChangedEvent, listingSubmittedForReviewEvent } from '../../domain/catalog-events';
import { CATALOG_REPOSITORY, CatalogActor, CatalogRepository, ListingView } from '../../domain/ports/catalog.repository';
import { CatalogAccessService } from '../catalog-access.service';
import { catalogError } from '../catalog.errors';

@Injectable()
export class ManageListingLifecycleUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository,
    private readonly access: CatalogAccessService
  ) {}

  async submitForReview(actor: CatalogActor, listingId: string): Promise<ListingView> {
    const seller = await this.access.requireActiveSeller(actor);
    const listing = await this.catalogRepository.changeListingLifecycle({
      sellerId: seller.sellerId,
      listingId,
      actorUserId: actor.authUserId,
      status: 'PENDING_REVIEW',
      moderationStatus: 'PENDING',
      outboxEvent: listingSubmittedForReviewEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });

    if (!listing) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return listing;
  }

  async pause(actor: CatalogActor, listingId: string): Promise<ListingView> {
    return this.changeSellerLifecycle(actor, listingId, 'PAUSED');
  }

  async archive(actor: CatalogActor, listingId: string): Promise<ListingView> {
    return this.changeSellerLifecycle(actor, listingId, 'ARCHIVED');
  }

  private async changeSellerLifecycle(actor: CatalogActor, listingId: string, status: 'PAUSED' | 'ARCHIVED'): Promise<ListingView> {
    const seller = await this.access.requireActiveSeller(actor);
    const listing = await this.catalogRepository.changeListingLifecycle({
      sellerId: seller.sellerId,
      listingId,
      actorUserId: actor.authUserId,
      status,
      outboxEvent: listingLifecycleChangedEvent({ listingId, sellerId: seller.sellerId, actorUserId: actor.authUserId, status })
    });

    if (!listing) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return listing;
  }
}
