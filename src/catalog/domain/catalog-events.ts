import { DomainEventDraft } from './domain-event';
import { ListingStatus } from './catalog-types';

const occurredAt = () => new Date().toISOString();

const event = (topic: string, payload: Record<string, unknown>): DomainEventDraft => ({
  topic,
  type: topic,
  payload: { ...payload, occurredAt: occurredAt() }
});

export const categoryCreatedEvent = (payload: { categoryId: string; actorUserId: string }) =>
  event('catalog.category.created.v1', payload);

export const categoryUpdatedEvent = (payload: { categoryId: string; actorUserId: string }) =>
  event('catalog.category.updated.v1', payload);

export const categoryDeactivatedEvent = (payload: { categoryId: string; actorUserId: string }) =>
  event('catalog.category.deactivated.v1', payload);

export const listingCreatedEvent = (payload: { listingId?: string; sellerId: string; actorUserId: string }) =>
  event('catalog.listing.created.v1', payload);

export const listingUpdatedEvent = (payload: { listingId: string; sellerId: string; actorUserId: string }) =>
  event('catalog.listing.updated.v1', payload);

export const listingSubmittedForReviewEvent = (payload: { listingId: string; sellerId: string; actorUserId: string }) =>
  event('catalog.listing.submitted_for_review.v1', payload);

export const listingLifecycleChangedEvent = (payload: {
  listingId: string;
  sellerId: string;
  actorUserId: string;
  status: ListingStatus;
}) => {
  const topics: Partial<Record<ListingStatus, string>> = {
    PUBLISHED: 'catalog.listing.published.v1',
    PAUSED: 'catalog.listing.paused.v1',
    ARCHIVED: 'catalog.listing.archived.v1',
    BLOCKED: 'catalog.listing.blocked.v1',
    REJECTED: 'catalog.listing.rejected.v1',
    DRAFT: 'catalog.listing.updated.v1'
  };

  return event(topics[payload.status] ?? 'catalog.listing.updated.v1', payload);
};

export const listingMediaUpdatedEvent = (payload: { listingId: string; sellerId: string; actorUserId: string }) =>
  event('catalog.listing.media.updated.v1', payload);

export const bulkImportSubmittedEvent = (payload: { jobId: string; sellerId: string; actorUserId: string }) =>
  event('catalog.bulk_import.submitted.v1', payload);

export const bulkImportCompletedEvent = (payload: { jobId: string; sellerId: string; actorUserId: string }) =>
  event('catalog.bulk_import.completed.v1', payload);
