import { Inject, Injectable } from '@nestjs/common';
import { listingLifecycleChangedEvent } from '../../domain/catalog-events';
import { ModerationAction } from '../../domain/catalog-types';
import { CATALOG_REPOSITORY, CatalogRepository, ListingView } from '../../domain/ports/catalog.repository';
import { catalogError } from '../catalog.errors';

type ModerationDecision = {
  action: ModerationAction;
  reason?: string;
};

@Injectable()
export class ManageModerationUseCase {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository) {}

  async moderate(actorUserId: string, listingId: string, decision: ModerationDecision): Promise<ListingView> {
    const listing = await this.catalogRepository.findListingById(listingId);

    if (!listing) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    const statusByAction = {
      APPROVE: 'PUBLISHED',
      REJECT: 'REJECTED',
      BLOCK: 'BLOCKED',
      REQUEST_CHANGES: 'DRAFT'
    } as const;
    const moderationByAction = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      BLOCK: 'BLOCKED',
      REQUEST_CHANGES: 'CHANGES_REQUESTED'
    } as const;

    const status = statusByAction[decision.action];
    const moderated = await this.catalogRepository.moderateListing({
      listingId,
      actorUserId,
      status,
      moderationStatus: moderationByAction[decision.action],
      reason: decision.reason,
      outboxEvent: listingLifecycleChangedEvent({ listingId, sellerId: listing.sellerId, actorUserId, status })
    });

    if (!moderated) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return moderated;
  }
}
