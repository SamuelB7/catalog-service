import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY, CatalogRepository, ListingView } from '../../domain/ports/catalog.repository';
import { catalogError } from '../catalog.errors';

@Injectable()
export class GetPublicListingUseCase {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository) {}

  async execute(listingId: string): Promise<ListingView> {
    const listing = await this.catalogRepository.findPublicListing(listingId);

    if (!listing) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return {
      ...listing,
      stockSummary: null,
      ratingSummary: null,
      promotionSummary: null,
      shippingSummary: null
    };
  }
}
