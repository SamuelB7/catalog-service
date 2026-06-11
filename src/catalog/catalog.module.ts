import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { CatalogAccessService } from './application/catalog-access.service';
import { GetPublicListingUseCase } from './application/use-cases/get-public-listing.use-case';
import { ManageBulkImportsUseCase } from './application/use-cases/manage-bulk-imports.use-case';
import { ManageCategoriesUseCase } from './application/use-cases/manage-categories.use-case';
import { ManageListingLifecycleUseCase } from './application/use-cases/manage-listing-lifecycle.use-case';
import { ManageListingsUseCase } from './application/use-cases/manage-listings.use-case';
import { ManageMediaUseCase } from './application/use-cases/manage-media.use-case';
import { ManageModerationUseCase } from './application/use-cases/manage-moderation.use-case';
import { ManageVariantsUseCase } from './application/use-cases/manage-variants.use-case';
import { SyncSellerStatusUseCase } from './application/use-cases/sync-seller-status.use-case';
import { catalogRepositoryProvider } from './infrastructure/persistence/prisma-catalog.repository';
import { fileStorageProvider } from './infrastructure/storage/mock-file-storage.adapter';
import { CatalogController } from './interfaces/http/catalog.controller';
import { AccessTokenGuard } from './interfaces/http/guards/access-token.guard';
import { RolesGuard } from './interfaces/http/guards/roles.guard';
import { CatalogEventsConsumer } from './interfaces/kafka/catalog-events.consumer';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CatalogController, CatalogEventsConsumer],
  providers: [
    PrismaService,
    catalogRepositoryProvider,
    fileStorageProvider,
    CatalogAccessService,
    ManageCategoriesUseCase,
    ManageListingsUseCase,
    ManageVariantsUseCase,
    ManageMediaUseCase,
    ManageListingLifecycleUseCase,
    ManageModerationUseCase,
    GetPublicListingUseCase,
    ManageBulkImportsUseCase,
    SyncSellerStatusUseCase,
    AccessTokenGuard,
    RolesGuard
  ]
})
export class CatalogModule {}
