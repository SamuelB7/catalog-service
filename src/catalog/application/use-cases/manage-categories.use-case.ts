import { Inject, Injectable } from '@nestjs/common';
import { categoryCreatedEvent, categoryDeactivatedEvent, categoryUpdatedEvent } from '../../domain/catalog-events';
import { CATALOG_REPOSITORY, CatalogRepository, CategoryInput, CategoryPatch, CategoryView } from '../../domain/ports/catalog.repository';
import { catalogError } from '../catalog.errors';

@Injectable()
export class ManageCategoriesUseCase {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly catalogRepository: CatalogRepository) {}

  create(actorUserId: string, category: CategoryInput): Promise<CategoryView> {
    return this.catalogRepository.createCategory({
      category,
      outboxEvent: categoryCreatedEvent({ categoryId: 'pending', actorUserId })
    });
  }

  list(): Promise<CategoryView[]> {
    return this.catalogRepository.listCategories();
  }

  async update(actorUserId: string, categoryId: string, patch: CategoryPatch): Promise<CategoryView> {
    const category = await this.catalogRepository.updateCategory({
      categoryId,
      patch,
      outboxEvent: categoryUpdatedEvent({ categoryId, actorUserId })
    });

    if (!category) {
      throw catalogError('CATEGORY_NOT_FOUND', 'Category not found.');
    }

    return category;
  }

  reorder(actorUserId: string, categoryId: string, sortOrder: number): Promise<CategoryView> {
    return this.update(actorUserId, categoryId, { sortOrder });
  }

  async deactivate(actorUserId: string, categoryId: string): Promise<CategoryView> {
    const category = await this.catalogRepository.deactivateCategory({
      categoryId,
      outboxEvent: categoryDeactivatedEvent({ categoryId, actorUserId })
    });

    if (!category) {
      throw catalogError('CATEGORY_NOT_FOUND', 'Category not found.');
    }

    return category;
  }
}
