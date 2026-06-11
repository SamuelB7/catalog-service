import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ListingStatus } from '../../domain/catalog-types';
import { DomainEventDraft } from '../../domain/domain-event';
import {
  BulkImportJobView,
  BulkImportProcessedItem,
  CATALOG_REPOSITORY,
  CatalogRepository,
  CatalogSellerView,
  CategoryInput,
  CategoryPatch,
  CategoryView,
  ListingInput,
  ListingMediaInput,
  ListingMediaPatch,
  ListingMediaView,
  ListingPatch,
  ListingVariantInput,
  ListingVariantPatch,
  ListingVariantView,
  ListingView
} from '../../domain/ports/catalog.repository';

const listingInclude = {
  category: true,
  variants: { orderBy: { createdAt: 'asc' } },
  media: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }
} satisfies Prisma.ListingInclude;

const jobInclude = {
  items: { orderBy: { lineNumber: 'asc' } }
} satisfies Prisma.BulkImportJobInclude;

type PrismaCategory = Prisma.CategoryGetPayload<object>;
type PrismaSeller = Prisma.CatalogSellerGetPayload<object>;
type PrismaListing = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;
type PrismaVariant = Prisma.ListingVariantGetPayload<object>;
type PrismaMedia = Prisma.ListingMediaGetPayload<object>;
type PrismaJob = Prisma.BulkImportJobGetPayload<{ include: typeof jobInclude }>;

@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  createCategory(input: { category: CategoryInput; outboxEvent: DomainEventDraft }): Promise<CategoryView> {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: this.toCategoryCreate(input.category)
      });

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent, { categoryId: category.id }) });
      return this.mapCategory(category);
    });
  }

  async listCategories(): Promise<CategoryView[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }]
    });

    return categories.map((category) => this.mapCategory(category));
  }

  async findCategoryById(categoryId: string): Promise<CategoryView | null> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    return category ? this.mapCategory(category) : null;
  }

  updateCategory(input: { categoryId: string; patch: CategoryPatch; outboxEvent: DomainEventDraft }): Promise<CategoryView | null> {
    return this.nullOnNotFound(async () =>
      this.prisma.$transaction(async (tx) => {
        const category = await tx.category.update({
          where: { id: input.categoryId },
          data: this.toCategoryUpdate(input.patch)
        });

        await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
        return this.mapCategory(category);
      })
    );
  }

  deactivateCategory(input: { categoryId: string; outboxEvent: DomainEventDraft }): Promise<CategoryView | null> {
    return this.nullOnNotFound(async () =>
      this.prisma.$transaction(async (tx) => {
        const category = await tx.category.update({
          where: { id: input.categoryId },
          data: { status: 'INACTIVE' }
        });

        await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
        return this.mapCategory(category);
      })
    );
  }

  async upsertSeller(input: {
    sellerId: string;
    authUserId: string;
    email?: string;
    status: CatalogSellerView['status'];
  }): Promise<CatalogSellerView> {
    const seller = await this.prisma.catalogSeller.upsert({
      where: { sellerId: input.sellerId },
      update: {
        authUserId: input.authUserId,
        email: input.email,
        status: input.status
      },
      create: input
    });

    return this.mapSeller(seller);
  }

  async setSellerStatus(input: { sellerId: string; status: CatalogSellerView['status'] }): Promise<CatalogSellerView | null> {
    return this.nullOnNotFound(async () => {
      const seller = await this.prisma.catalogSeller.update({
        where: { sellerId: input.sellerId },
        data: { status: input.status }
      });

      return this.mapSeller(seller);
    });
  }

  async findSellerByAuthUserId(authUserId: string): Promise<CatalogSellerView | null> {
    const seller = await this.prisma.catalogSeller.findUnique({ where: { authUserId } });
    return seller ? this.mapSeller(seller) : null;
  }

  createListing(input: { sellerId: string; listing: ListingInput; outboxEvent: DomainEventDraft }): Promise<ListingView> {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          sellerId: input.sellerId,
          categoryId: input.listing.categoryId,
          title: input.listing.title,
          description: input.listing.description,
          brand: input.listing.brand,
          attributes: this.json(input.listing.attributes ?? {}),
          variants: {
            create: (input.listing.variants ?? []).map((variant) => this.toVariantCreate(variant))
          }
        },
        include: listingInclude
      });

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent, { listingId: listing.id }) });
      return this.mapListing(listing);
    });
  }

  async listSellerListings(sellerId: string): Promise<ListingView[]> {
    const listings = await this.prisma.listing.findMany({
      where: { sellerId },
      include: listingInclude,
      orderBy: { updatedAt: 'desc' }
    });

    return listings.map((listing) => this.mapListing(listing));
  }

  async findListingById(listingId: string): Promise<ListingView | null> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, include: listingInclude });
    return listing ? this.mapListing(listing) : null;
  }

  async findSellerListing(input: { sellerId: string; listingId: string }): Promise<ListingView | null> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: input.listingId, sellerId: input.sellerId },
      include: listingInclude
    });

    return listing ? this.mapListing(listing) : null;
  }

  updateListing(input: { sellerId: string; listingId: string; patch: ListingPatch; outboxEvent: DomainEventDraft }): Promise<ListingView | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.listing.findFirst({ where: { id: input.listingId, sellerId: input.sellerId } });
      if (!existing) return null;

      const listing = await tx.listing.update({
        where: { id: input.listingId },
        data: this.toListingUpdate(input.patch),
        include: listingInclude
      });

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return this.mapListing(listing);
    });
  }

  addVariant(input: {
    sellerId: string;
    listingId: string;
    variant: ListingVariantInput;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingVariantView | null> {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findFirst({ where: { id: input.listingId, sellerId: input.sellerId } });
      if (!listing) return null;

      const variant = await tx.listingVariant.create({
        data: { listingId: input.listingId, ...this.toVariantCreate(input.variant) }
      });

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return this.mapVariant(variant);
    });
  }

  updateVariant(input: {
    sellerId: string;
    listingId: string;
    variantId: string;
    patch: ListingVariantPatch;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingVariantView | null> {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.listingVariant.findFirst({
        where: { id: input.variantId, listingId: input.listingId, listing: { sellerId: input.sellerId } }
      });
      if (!variant) return null;

      const updated = await tx.listingVariant.update({
        where: { id: input.variantId },
        data: this.toVariantUpdate(input.patch)
      });

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return this.mapVariant(updated);
    });
  }

  deleteVariant(input: { sellerId: string; listingId: string; variantId: string; outboxEvent: DomainEventDraft }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.listingVariant.findFirst({
        where: { id: input.variantId, listingId: input.listingId, listing: { sellerId: input.sellerId } }
      });
      if (!variant) return false;

      await tx.listingVariant.delete({ where: { id: input.variantId } });
      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return true;
    });
  }

  addMedia(input: { sellerId: string; listingId: string; media: ListingMediaInput; outboxEvent: DomainEventDraft }): Promise<ListingMediaView | null> {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findFirst({ where: { id: input.listingId, sellerId: input.sellerId } });
      if (!listing) return null;

      if (input.media.isPrimary) {
        await tx.listingMedia.updateMany({ where: { listingId: input.listingId }, data: { isPrimary: false } });
      }

      const media = await tx.listingMedia.create({
        data: {
          listingId: input.listingId,
          mediaType: input.media.mediaType,
          url: input.media.url,
          fileReference: input.media.fileReference,
          altText: input.media.altText,
          sortOrder: input.media.sortOrder,
          isPrimary: input.media.isPrimary ?? false
        }
      });

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return this.mapMedia(media);
    });
  }

  async listMedia(input: { sellerId: string; listingId: string }): Promise<ListingMediaView[] | null> {
    const listing = await this.prisma.listing.findFirst({ where: { id: input.listingId, sellerId: input.sellerId } });
    if (!listing) return null;

    const media = await this.prisma.listingMedia.findMany({
      where: { listingId: input.listingId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    return media.map((item) => this.mapMedia(item));
  }

  updateMedia(input: {
    sellerId: string;
    listingId: string;
    mediaId: string;
    patch: ListingMediaPatch;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingMediaView | null> {
    return this.prisma.$transaction(async (tx) => {
      const media = await tx.listingMedia.findFirst({
        where: { id: input.mediaId, listingId: input.listingId, listing: { sellerId: input.sellerId } }
      });
      if (!media) return null;

      const updated = await tx.listingMedia.update({
        where: { id: input.mediaId },
        data: input.patch
      });

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return this.mapMedia(updated);
    });
  }

  deleteMedia(input: { sellerId: string; listingId: string; mediaId: string; outboxEvent: DomainEventDraft }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const media = await tx.listingMedia.findFirst({
        where: { id: input.mediaId, listingId: input.listingId, listing: { sellerId: input.sellerId } }
      });
      if (!media) return false;

      await tx.listingMedia.delete({ where: { id: input.mediaId } });
      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return true;
    });
  }

  setPrimaryMedia(input: { sellerId: string; listingId: string; mediaId: string; outboxEvent: DomainEventDraft }): Promise<ListingMediaView | null> {
    return this.prisma.$transaction(async (tx) => {
      const media = await tx.listingMedia.findFirst({
        where: { id: input.mediaId, listingId: input.listingId, listing: { sellerId: input.sellerId } }
      });
      if (!media) return null;

      await tx.listingMedia.updateMany({ where: { listingId: input.listingId }, data: { isPrimary: false } });
      const updated = await tx.listingMedia.update({ where: { id: input.mediaId }, data: { isPrimary: true } });
      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return this.mapMedia(updated);
    });
  }

  changeListingLifecycle(input: {
    sellerId: string;
    listingId: string;
    actorUserId: string;
    status: ListingStatus;
    moderationStatus?: ListingView['moderationStatus'];
    reason?: string;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingView | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.listing.findFirst({ where: { id: input.listingId, sellerId: input.sellerId } });
      if (!existing) return null;

      const listing = await tx.listing.update({
        where: { id: input.listingId },
        data: {
          status: input.status,
          moderationStatus: input.moderationStatus,
          moderationNotes: input.reason,
          publishedAt: input.status === 'PUBLISHED' ? new Date() : existing.publishedAt
        },
        include: listingInclude
      });

      await tx.listingModerationEvent.create({
        data: {
          listingId: input.listingId,
          fromStatus: existing.status,
          toStatus: input.status,
          moderationStatus: input.moderationStatus ?? existing.moderationStatus,
          actorUserId: input.actorUserId,
          reason: input.reason
        }
      });
      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return this.mapListing(listing);
    });
  }

  moderateListing(input: {
    listingId: string;
    actorUserId: string;
    status: ListingStatus;
    moderationStatus: ListingView['moderationStatus'];
    reason?: string;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingView | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.listing.findUnique({ where: { id: input.listingId } });
      if (!existing) return null;

      const listing = await tx.listing.update({
        where: { id: input.listingId },
        data: {
          status: input.status,
          moderationStatus: input.moderationStatus,
          moderationNotes: input.reason,
          publishedAt: input.status === 'PUBLISHED' ? new Date() : existing.publishedAt
        },
        include: listingInclude
      });

      await tx.listingModerationEvent.create({
        data: {
          listingId: input.listingId,
          fromStatus: existing.status,
          toStatus: input.status,
          moderationStatus: input.moderationStatus,
          actorUserId: input.actorUserId,
          reason: input.reason
        }
      });
      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.outboxEvent) });
      return this.mapListing(listing);
    });
  }

  async findPublicListing(listingId: string): Promise<ListingView | null> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: 'PUBLISHED', moderationStatus: 'APPROVED' },
      include: listingInclude
    });

    return listing ? this.mapListing(listing) : null;
  }

  createBulkImportJob(input: {
    sellerId: string;
    items: BulkImportProcessedItem[];
    submittedEvent: DomainEventDraft;
    completedEventFactory: (jobId: string) => DomainEventDraft;
  }): Promise<BulkImportJobView> {
    return this.prisma.$transaction(async (tx) => {
      const successCount = input.items.filter((item) => item.errors.length === 0).length;
      const errorCount = input.items.length - successCount;
      const status = successCount === 0 ? 'FAILED' : errorCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';

      const job = await tx.bulkImportJob.create({
        data: {
          sellerId: input.sellerId,
          status,
          totalItems: input.items.length,
          successCount,
          errorCount,
          completedAt: new Date()
        }
      });

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.submittedEvent, { jobId: job.id }) });

      for (const item of input.items) {
        let listingId: string | undefined;

        if (item.errors.length === 0) {
          const listing = await tx.listing.create({
            data: {
              sellerId: input.sellerId,
              categoryId: item.input.categoryId,
              title: item.input.title,
              description: item.input.description,
              brand: item.input.brand,
              attributes: this.json(item.input.attributes ?? {}),
              variants: {
                create: (item.input.variants ?? []).map((variant) => this.toVariantCreate(variant))
              }
            }
          });
          listingId = listing.id;
        }

        await tx.bulkImportJobItem.create({
          data: {
            jobId: job.id,
            lineNumber: item.lineNumber,
            status: item.errors.length === 0 ? 'CREATED' : 'FAILED',
            listingId,
            input: this.json(item.input),
            errors: item.errors.length ? this.json(item.errors) : undefined
          }
        });
      }

      await tx.outboxEvent.create({ data: this.toOutboxCreate(input.completedEventFactory(job.id)) });

      const completed = await tx.bulkImportJob.findUniqueOrThrow({
        where: { id: job.id },
        include: jobInclude
      });

      return this.mapJob(completed);
    });
  }

  async listBulkImportJobs(sellerId: string): Promise<BulkImportJobView[]> {
    const jobs = await this.prisma.bulkImportJob.findMany({
      where: { sellerId },
      include: jobInclude,
      orderBy: { createdAt: 'desc' }
    });

    return jobs.map((job) => this.mapJob(job));
  }

  async findBulkImportJob(input: { sellerId: string; jobId: string }): Promise<BulkImportJobView | null> {
    const job = await this.prisma.bulkImportJob.findFirst({
      where: { id: input.jobId, sellerId: input.sellerId },
      include: jobInclude
    });

    return job ? this.mapJob(job) : null;
  }

  private toCategoryCreate(category: CategoryInput): Prisma.CategoryCreateInput {
    return {
      parent: category.parentId ? { connect: { id: category.parentId } } : undefined,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      attributeSchema: category.attributeSchema ? this.json(category.attributeSchema) : undefined
    };
  }

  private toCategoryUpdate(category: CategoryPatch): Prisma.CategoryUpdateInput {
    return {
      parent: category.parentId ? { connect: { id: category.parentId } } : category.parentId === null ? { disconnect: true } : undefined,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      status: category.status,
      attributeSchema: category.attributeSchema ? this.json(category.attributeSchema) : undefined
    };
  }

  private toListingUpdate(patch: ListingPatch): Prisma.ListingUpdateInput {
    return {
      category: patch.categoryId ? { connect: { id: patch.categoryId } } : undefined,
      title: patch.title,
      description: patch.description,
      brand: patch.brand,
      attributes: patch.attributes ? this.json(patch.attributes) : undefined,
      status: 'DRAFT',
      moderationStatus: 'NOT_SUBMITTED',
      moderationNotes: null
    };
  }

  private toVariantCreate(variant: ListingVariantInput): Prisma.ListingVariantCreateWithoutListingInput {
    return {
      sku: variant.sku,
      optionValues: this.json(variant.optionValues),
      basePriceCents: variant.basePriceCents,
      currency: variant.currency ?? 'USD',
      weightGrams: variant.weightGrams,
      lengthMm: variant.lengthMm,
      widthMm: variant.widthMm,
      heightMm: variant.heightMm
    };
  }

  private toVariantUpdate(variant: ListingVariantPatch): Prisma.ListingVariantUpdateInput {
    return {
      sku: variant.sku,
      optionValues: variant.optionValues ? this.json(variant.optionValues) : undefined,
      basePriceCents: variant.basePriceCents,
      currency: variant.currency,
      weightGrams: variant.weightGrams,
      lengthMm: variant.lengthMm,
      widthMm: variant.widthMm,
      heightMm: variant.heightMm
    };
  }

  private toOutboxCreate(event: DomainEventDraft, payloadPatch: Record<string, unknown> = {}): Prisma.OutboxEventCreateInput {
    return {
      topic: event.topic,
      type: event.type,
      payload: this.json({ ...event.payload, ...payloadPatch })
    };
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private mapCategory(category: PrismaCategory): CategoryView {
    return {
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      status: category.status,
      sortOrder: category.sortOrder,
      attributeSchema: category.attributeSchema,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  private mapSeller(seller: PrismaSeller): CatalogSellerView {
    return {
      sellerId: seller.sellerId,
      authUserId: seller.authUserId,
      email: seller.email,
      status: seller.status
    };
  }

  private mapListing(listing: PrismaListing): ListingView {
    return {
      id: listing.id,
      sellerId: listing.sellerId,
      categoryId: listing.categoryId,
      title: listing.title,
      description: listing.description,
      brand: listing.brand,
      attributes: listing.attributes,
      status: listing.status,
      moderationStatus: listing.moderationStatus,
      moderationNotes: listing.moderationNotes,
      publishedAt: listing.publishedAt,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      category: listing.category ? this.mapCategory(listing.category) : undefined,
      variants: listing.variants.map((variant) => this.mapVariant(variant)),
      media: listing.media.map((media) => this.mapMedia(media))
    };
  }

  private mapVariant(variant: PrismaVariant): ListingVariantView {
    return {
      id: variant.id,
      sku: variant.sku,
      optionValues: variant.optionValues as Record<string, unknown>,
      basePriceCents: variant.basePriceCents,
      currency: variant.currency,
      weightGrams: variant.weightGrams ?? undefined,
      lengthMm: variant.lengthMm ?? undefined,
      widthMm: variant.widthMm ?? undefined,
      heightMm: variant.heightMm ?? undefined,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt
    };
  }

  private mapMedia(media: PrismaMedia): ListingMediaView {
    return {
      id: media.id,
      mediaType: media.mediaType,
      url: media.url,
      fileReference: media.fileReference,
      altText: media.altText,
      sortOrder: media.sortOrder,
      isPrimary: media.isPrimary,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt
    };
  }

  private mapJob(job: PrismaJob): BulkImportJobView {
    return {
      id: job.id,
      sellerId: job.sellerId,
      status: job.status,
      totalItems: job.totalItems,
      successCount: job.successCount,
      errorCount: job.errorCount,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      items: job.items.map((item) => ({
        id: item.id,
        lineNumber: item.lineNumber,
        status: item.status,
        listingId: item.listingId,
        input: item.input,
        errors: item.errors,
        createdAt: item.createdAt
      }))
    };
  }

  private async nullOnNotFound<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }

      throw error;
    }
  }
}

export const catalogRepositoryProvider = {
  provide: CATALOG_REPOSITORY,
  useClass: PrismaCatalogRepository
};
