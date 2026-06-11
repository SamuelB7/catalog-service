import { Inject, Injectable } from '@nestjs/common';
import { CatalogSellerStatus } from '../../domain/catalog-types';
import { CATALOG_REPOSITORY, CatalogRepository } from '../../domain/ports/catalog.repository';

@Injectable()
export class SyncSellerStatusUseCase {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository) {}

  applicationSubmitted(input: { sellerId: string; authUserId: string; email?: string }): Promise<unknown> {
    return this.catalogRepository.upsertSeller({
      sellerId: input.sellerId,
      authUserId: input.authUserId,
      email: input.email,
      status: 'PENDING_REVIEW'
    });
  }

  statusChanged(input: { sellerId: string; status: CatalogSellerStatus }): Promise<unknown> {
    return this.catalogRepository.setSellerStatus(input);
  }
}
