export type CategoryStatus = 'ACTIVE' | 'INACTIVE';
export type CatalogSellerStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
export type ListingStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED' | 'BLOCKED' | 'REJECTED';
export type ListingModerationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'CHANGES_REQUESTED';
export type ListingMediaType = 'IMAGE' | 'VIDEO';
export type BulkImportStatus = 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
export type BulkImportItemStatus = 'CREATED' | 'FAILED';
export type ModerationAction = 'APPROVE' | 'REJECT' | 'BLOCK' | 'REQUEST_CHANGES';
