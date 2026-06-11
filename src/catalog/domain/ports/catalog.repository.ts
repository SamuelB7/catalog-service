import { DomainEventDraft } from '../domain-event';
import {
  BulkImportItemStatus,
  BulkImportStatus,
  CatalogSellerStatus,
  CategoryStatus,
  ListingMediaType,
  ListingModerationStatus,
  ListingStatus
} from '../catalog-types';

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

export type CatalogActor = {
  authUserId: string;
  email: string;
  roles: string[];
};

export type CategoryInput = {
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  attributeSchema?: Record<string, unknown>;
};

export type CategoryPatch = Omit<Partial<CategoryInput>, 'parentId'> & {
  parentId?: string | null;
  status?: CategoryStatus;
};

export type CategoryView = {
  id: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  status: CategoryStatus;
  sortOrder: number;
  attributeSchema?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type CatalogSellerView = {
  sellerId: string;
  authUserId: string;
  email?: string | null;
  status: CatalogSellerStatus;
};

export type ListingVariantInput = {
  sku: string;
  optionValues: Record<string, unknown>;
  basePriceCents: number;
  currency?: string;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
};

export type ListingVariantPatch = Partial<ListingVariantInput>;

export type ListingVariantView = Required<Pick<ListingVariantInput, 'sku' | 'basePriceCents'>> &
  Omit<ListingVariantInput, 'currency'> & {
    id: string;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  };

export type ListingMediaInput = {
  mediaType: ListingMediaType;
  url: string;
  fileReference: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
};

export type ListingMediaPatch = {
  altText?: string;
  sortOrder?: number;
};

export type ListingMediaView = Required<Pick<ListingMediaInput, 'mediaType' | 'url' | 'fileReference'>> & {
  id: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ListingInput = {
  categoryId: string;
  title: string;
  description: string;
  brand?: string;
  attributes?: Record<string, unknown>;
  variants?: ListingVariantInput[];
};

export type ListingPatch = Partial<ListingInput>;

export type ListingView = {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string;
  brand?: string | null;
  attributes: unknown;
  status: ListingStatus;
  moderationStatus: ListingModerationStatus;
  moderationNotes?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category?: CategoryView;
  variants: ListingVariantView[];
  media: ListingMediaView[];
  stockSummary?: null;
  ratingSummary?: null;
  promotionSummary?: null;
  shippingSummary?: null;
};

export type BulkImportItemInput = ListingInput & {
  lineNumber?: number;
};

export type BulkImportItemView = {
  id: string;
  lineNumber: number;
  status: BulkImportItemStatus;
  listingId?: string | null;
  input: unknown;
  errors?: unknown;
  createdAt: Date;
};

export type BulkImportJobView = {
  id: string;
  sellerId: string;
  status: BulkImportStatus;
  totalItems: number;
  successCount: number;
  errorCount: number;
  createdAt: Date;
  completedAt?: Date | null;
  items: BulkImportItemView[];
};

export type BulkImportProcessedItem = {
  lineNumber: number;
  input: BulkImportItemInput;
  errors: string[];
};

export interface CatalogRepository {
  createCategory(input: { category: CategoryInput; outboxEvent: DomainEventDraft }): Promise<CategoryView>;
  listCategories(): Promise<CategoryView[]>;
  findCategoryById(categoryId: string): Promise<CategoryView | null>;
  updateCategory(input: { categoryId: string; patch: CategoryPatch; outboxEvent: DomainEventDraft }): Promise<CategoryView | null>;
  deactivateCategory(input: { categoryId: string; outboxEvent: DomainEventDraft }): Promise<CategoryView | null>;

  upsertSeller(input: { sellerId: string; authUserId: string; email?: string; status: CatalogSellerStatus }): Promise<CatalogSellerView>;
  setSellerStatus(input: { sellerId: string; status: CatalogSellerStatus }): Promise<CatalogSellerView | null>;
  findSellerByAuthUserId(authUserId: string): Promise<CatalogSellerView | null>;

  createListing(input: { sellerId: string; listing: ListingInput; outboxEvent: DomainEventDraft }): Promise<ListingView>;
  listSellerListings(sellerId: string): Promise<ListingView[]>;
  findListingById(listingId: string): Promise<ListingView | null>;
  findSellerListing(input: { sellerId: string; listingId: string }): Promise<ListingView | null>;
  updateListing(input: { sellerId: string; listingId: string; patch: ListingPatch; outboxEvent: DomainEventDraft }): Promise<ListingView | null>;

  addVariant(input: { sellerId: string; listingId: string; variant: ListingVariantInput; outboxEvent: DomainEventDraft }): Promise<ListingVariantView | null>;
  updateVariant(input: {
    sellerId: string;
    listingId: string;
    variantId: string;
    patch: ListingVariantPatch;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingVariantView | null>;
  deleteVariant(input: { sellerId: string; listingId: string; variantId: string; outboxEvent: DomainEventDraft }): Promise<boolean>;

  addMedia(input: { sellerId: string; listingId: string; media: ListingMediaInput; outboxEvent: DomainEventDraft }): Promise<ListingMediaView | null>;
  listMedia(input: { sellerId: string; listingId: string }): Promise<ListingMediaView[] | null>;
  updateMedia(input: {
    sellerId: string;
    listingId: string;
    mediaId: string;
    patch: ListingMediaPatch;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingMediaView | null>;
  deleteMedia(input: { sellerId: string; listingId: string; mediaId: string; outboxEvent: DomainEventDraft }): Promise<boolean>;
  setPrimaryMedia(input: { sellerId: string; listingId: string; mediaId: string; outboxEvent: DomainEventDraft }): Promise<ListingMediaView | null>;

  changeListingLifecycle(input: {
    sellerId: string;
    listingId: string;
    actorUserId: string;
    status: ListingStatus;
    moderationStatus?: ListingModerationStatus;
    reason?: string;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingView | null>;
  moderateListing(input: {
    listingId: string;
    actorUserId: string;
    status: ListingStatus;
    moderationStatus: ListingModerationStatus;
    reason?: string;
    outboxEvent: DomainEventDraft;
  }): Promise<ListingView | null>;
  findPublicListing(listingId: string): Promise<ListingView | null>;

  createBulkImportJob(input: {
    sellerId: string;
    items: BulkImportProcessedItem[];
    submittedEvent: DomainEventDraft;
    completedEventFactory: (jobId: string) => DomainEventDraft;
  }): Promise<BulkImportJobView>;
  listBulkImportJobs(sellerId: string): Promise<BulkImportJobView[]>;
  findBulkImportJob(input: { sellerId: string; jobId: string }): Promise<BulkImportJobView | null>;
}
