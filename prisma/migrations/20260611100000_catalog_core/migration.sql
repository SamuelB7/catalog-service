CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CatalogSellerStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'ARCHIVED', 'BLOCKED', 'REJECTED');
CREATE TYPE "ListingModerationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'BLOCKED', 'CHANGES_REQUESTED');
CREATE TYPE "ListingMediaType" AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE "BulkImportStatus" AS ENUM ('COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');
CREATE TYPE "BulkImportItemStatus" AS ENUM ('CREATED', 'FAILED');

CREATE TABLE "categories" (
  "id" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "attributeSchema" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_sellers" (
  "sellerId" TEXT NOT NULL,
  "authUserId" TEXT NOT NULL,
  "email" TEXT,
  "status" "CatalogSellerStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_sellers_pkey" PRIMARY KEY ("sellerId")
);

CREATE TABLE "listings" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "brand" TEXT,
  "attributes" JSONB NOT NULL,
  "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
  "moderationStatus" "ListingModerationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  "moderationNotes" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_variants" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "optionValues" JSONB NOT NULL,
  "basePriceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "weightGrams" INTEGER,
  "lengthMm" INTEGER,
  "widthMm" INTEGER,
  "heightMm" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "listing_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_media" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "mediaType" "ListingMediaType" NOT NULL,
  "url" TEXT NOT NULL,
  "fileReference" TEXT NOT NULL,
  "altText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "listing_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_moderation_events" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "fromStatus" "ListingStatus",
  "toStatus" "ListingStatus" NOT NULL,
  "moderationStatus" "ListingModerationStatus" NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_moderation_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bulk_import_jobs" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "status" "BulkImportStatus" NOT NULL,
  "totalItems" INTEGER NOT NULL,
  "successCount" INTEGER NOT NULL,
  "errorCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "bulk_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bulk_import_job_items" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "status" "BulkImportItemStatus" NOT NULL,
  "listingId" TEXT,
  "input" JSONB NOT NULL,
  "errors" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bulk_import_job_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");
CREATE INDEX "categories_status_idx" ON "categories"("status");
CREATE UNIQUE INDEX "catalog_sellers_authUserId_key" ON "catalog_sellers"("authUserId");
CREATE INDEX "catalog_sellers_status_idx" ON "catalog_sellers"("status");
CREATE INDEX "listings_sellerId_idx" ON "listings"("sellerId");
CREATE INDEX "listings_categoryId_idx" ON "listings"("categoryId");
CREATE INDEX "listings_status_idx" ON "listings"("status");
CREATE INDEX "listings_moderationStatus_idx" ON "listings"("moderationStatus");
CREATE UNIQUE INDEX "listing_variants_listingId_sku_key" ON "listing_variants"("listingId", "sku");
CREATE INDEX "listing_variants_listingId_idx" ON "listing_variants"("listingId");
CREATE INDEX "listing_media_listingId_idx" ON "listing_media"("listingId");
CREATE INDEX "listing_moderation_events_listingId_idx" ON "listing_moderation_events"("listingId");
CREATE INDEX "bulk_import_jobs_sellerId_idx" ON "bulk_import_jobs"("sellerId");
CREATE INDEX "bulk_import_jobs_status_idx" ON "bulk_import_jobs"("status");
CREATE INDEX "bulk_import_job_items_jobId_idx" ON "bulk_import_job_items"("jobId");
CREATE INDEX "outbox_events_topic_idx" ON "outbox_events"("topic");
CREATE INDEX "outbox_events_publishedAt_idx" ON "outbox_events"("publishedAt");

ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "catalog_sellers"("sellerId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listing_variants" ADD CONSTRAINT "listing_variants_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_moderation_events" ADD CONSTRAINT "listing_moderation_events_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bulk_import_job_items" ADD CONSTRAINT "bulk_import_job_items_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "bulk_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
