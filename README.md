# catalog-service

Responsible for products, categories, listings, variations, attributes, and listing media.

Product catalog and listing source-of-truth service built with NestJS, Prisma, PostgreSQL, JSONB attributes, JWT validation, mock media storage, and Kafka integration events.

## Project Origin

This microservice is part of the [ecommerce-eda](https://github.com/SamuelB7/ecommerce-eda) event-driven marketplace platform.

## Endpoints

- `GET /health`
- `POST /events/demo`
- `POST /admin/catalog/categories`
- `GET /admin/catalog/categories`
- `PUT /admin/catalog/categories/:categoryId`
- `PUT /admin/catalog/categories/:categoryId/reorder`
- `DELETE /admin/catalog/categories/:categoryId`
- `POST /sellers/me/listings`
- `GET /sellers/me/listings`
- `GET /sellers/me/listings/:listingId`
- `PUT /sellers/me/listings/:listingId`
- `POST /sellers/me/listings/:listingId/variants`
- `PUT /sellers/me/listings/:listingId/variants/:variantId`
- `DELETE /sellers/me/listings/:listingId/variants/:variantId`
- `POST /sellers/me/listings/:listingId/media`
- `GET /sellers/me/listings/:listingId/media`
- `PUT /sellers/me/listings/:listingId/media/:mediaId`
- `DELETE /sellers/me/listings/:listingId/media/:mediaId`
- `PUT /sellers/me/listings/:listingId/media/:mediaId/primary`
- `PUT /sellers/me/listings/:listingId/submit-for-review`
- `PUT /sellers/me/listings/:listingId/pause`
- `PUT /sellers/me/listings/:listingId/archive`
- `PUT /admin/catalog/listings/:listingId/moderation`
- `GET /catalog/listings/:listingId`
- `POST /sellers/me/listings/bulk-imports`
- `GET /sellers/me/listings/bulk-imports`
- `GET /sellers/me/listings/bulk-imports/:jobId`

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

## Media Storage

Listing media uses a `FileStoragePort` abstraction. The current adapter is a mock that returns `mock://catalog-media/...` references and can be replaced later by S3 or another object storage provider.

## Demo Topic

- `catalog.demo.event.v1`

## Integration Events

Consumed:

- `seller.application.submitted.v1`
- `seller.approved.v1`
- `seller.reactivated.v1`
- `seller.suspended.v1`
- `seller.rejected.v1`

Stored in outbox:

- `catalog.category.created.v1`
- `catalog.category.updated.v1`
- `catalog.category.deactivated.v1`
- `catalog.listing.created.v1`
- `catalog.listing.updated.v1`
- `catalog.listing.submitted_for_review.v1`
- `catalog.listing.published.v1`
- `catalog.listing.paused.v1`
- `catalog.listing.archived.v1`
- `catalog.listing.blocked.v1`
- `catalog.listing.rejected.v1`
- `catalog.listing.media.updated.v1`
- `catalog.bulk_import.submitted.v1`
- `catalog.bulk_import.completed.v1`
