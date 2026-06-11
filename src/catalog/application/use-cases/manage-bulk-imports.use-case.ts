import { Inject, Injectable } from '@nestjs/common';
import { bulkImportCompletedEvent, bulkImportSubmittedEvent } from '../../domain/catalog-events';
import {
  BulkImportItemInput,
  BulkImportJobView,
  BulkImportProcessedItem,
  CATALOG_REPOSITORY,
  CatalogActor,
  CatalogRepository
} from '../../domain/ports/catalog.repository';
import { CatalogAccessService } from '../catalog-access.service';
import { catalogError } from '../catalog.errors';

@Injectable()
export class ManageBulkImportsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository,
    private readonly access: CatalogAccessService
  ) {}

  async submit(actor: CatalogActor, items: BulkImportItemInput[]): Promise<BulkImportJobView> {
    if (!items.length) {
      throw catalogError('BULK_IMPORT_EMPTY', 'Bulk import requires at least one item.');
    }

    const seller = await this.access.requireActiveSeller(actor);
    const processed: BulkImportProcessedItem[] = [];

    for (const [index, item] of items.entries()) {
      const errors: string[] = [];

      if (!item.title) errors.push('title is required');
      if (!item.description) errors.push('description is required');
      if (!item.categoryId) errors.push('categoryId is required');
      if (!item.variants?.length) errors.push('at least one variant is required');

      if (item.categoryId) {
        const category = await this.catalogRepository.findCategoryById(item.categoryId);
        if (!category || category.status !== 'ACTIVE') errors.push('category must be active');
      }

      processed.push({
        lineNumber: item.lineNumber ?? index + 1,
        input: item,
        errors
      });
    }

    return this.catalogRepository.createBulkImportJob({
      sellerId: seller.sellerId,
      items: processed,
      submittedEvent: bulkImportSubmittedEvent({ jobId: 'pending', sellerId: seller.sellerId, actorUserId: actor.authUserId }),
      completedEventFactory: (jobId) => bulkImportCompletedEvent({ jobId, sellerId: seller.sellerId, actorUserId: actor.authUserId })
    });
  }

  async list(actor: CatalogActor): Promise<BulkImportJobView[]> {
    const seller = await this.access.requireActiveSeller(actor);
    return this.catalogRepository.listBulkImportJobs(seller.sellerId);
  }

  async get(actor: CatalogActor, jobId: string): Promise<BulkImportJobView> {
    const seller = await this.access.requireActiveSeller(actor);
    const job = await this.catalogRepository.findBulkImportJob({ sellerId: seller.sellerId, jobId });

    if (!job) {
      throw catalogError('LISTING_NOT_FOUND', 'Bulk import job not found.');
    }

    return job;
  }
}
