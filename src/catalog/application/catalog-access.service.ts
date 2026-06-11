import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogActor,
  CatalogRepository,
  CatalogSellerView,
  CategoryView,
  ListingView
} from '../domain/ports/catalog.repository';
import { catalogError } from './catalog.errors';

@Injectable()
export class CatalogAccessService {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository) {}

  async requireActiveSeller(actor: CatalogActor): Promise<CatalogSellerView> {
    const seller = await this.catalogRepository.findSellerByAuthUserId(actor.authUserId);

    if (!seller || seller.status !== 'ACTIVE') {
      throw catalogError('SELLER_NOT_ACTIVE', 'Seller is not active in catalog.');
    }

    return seller;
  }

  async requireActiveCategory(categoryId: string): Promise<CategoryView> {
    const category = await this.catalogRepository.findCategoryById(categoryId);

    if (!category) {
      throw catalogError('CATEGORY_NOT_FOUND', 'Category not found.');
    }

    if (category.status !== 'ACTIVE') {
      throw catalogError('CATEGORY_INACTIVE', 'Category is inactive.');
    }

    return category;
  }

  async requireSellerListing(sellerId: string, listingId: string): Promise<ListingView> {
    const listing = await this.catalogRepository.findSellerListing({ sellerId, listingId });

    if (!listing) {
      throw catalogError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return listing;
  }
}
