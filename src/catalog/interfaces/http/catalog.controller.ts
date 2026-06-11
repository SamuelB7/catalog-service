import { Body, Controller, Delete, Get, Param, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ManageBulkImportsUseCase } from '../../application/use-cases/manage-bulk-imports.use-case';
import { ManageCategoriesUseCase } from '../../application/use-cases/manage-categories.use-case';
import { GetPublicListingUseCase } from '../../application/use-cases/get-public-listing.use-case';
import { ManageListingLifecycleUseCase } from '../../application/use-cases/manage-listing-lifecycle.use-case';
import { ManageListingsUseCase } from '../../application/use-cases/manage-listings.use-case';
import { ManageMediaUseCase } from '../../application/use-cases/manage-media.use-case';
import { ManageModerationUseCase } from '../../application/use-cases/manage-moderation.use-case';
import { ManageVariantsUseCase } from '../../application/use-cases/manage-variants.use-case';
import { CatalogActor } from '../../domain/ports/catalog.repository';
import { AuthenticatedRequest } from './authenticated-request';
import { BulkImportDto } from './dtos/bulk-import.dto';
import { CategoryDto, ReorderCategoryDto, UpdateCategoryDto } from './dtos/category.dto';
import { ListingDto, ListingVariantDto, UpdateListingDto, UpdateListingVariantDto } from './dtos/listing.dto';
import { UpdateMediaDto, UploadMediaDto } from './dtos/media.dto';
import { ModerationDto } from './dtos/moderation.dto';
import { mapCatalogError } from './catalog-error.mapper';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RequireRoles } from './guards/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(
    private readonly manageCategoriesUseCase: ManageCategoriesUseCase,
    private readonly manageListingsUseCase: ManageListingsUseCase,
    private readonly manageVariantsUseCase: ManageVariantsUseCase,
    private readonly manageMediaUseCase: ManageMediaUseCase,
    private readonly manageListingLifecycleUseCase: ManageListingLifecycleUseCase,
    private readonly manageModerationUseCase: ManageModerationUseCase,
    private readonly getPublicListingUseCase: GetPublicListingUseCase,
    private readonly manageBulkImportsUseCase: ManageBulkImportsUseCase
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category' })
  @ApiBody({ type: CategoryDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @Post('admin/catalog/categories')
  createCategory(@Req() request: AuthenticatedRequest, @Body() dto: CategoryDto) {
    return this.handle(this.manageCategoriesUseCase.create(request.user.id, dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List categories' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @Get('admin/catalog/categories')
  listCategories() {
    return this.handle(this.manageCategoriesUseCase.list());
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  @ApiBody({ type: UpdateCategoryDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @Put('admin/catalog/categories/:categoryId')
  updateCategory(@Req() request: AuthenticatedRequest, @Param('categoryId') categoryId: string, @Body() dto: UpdateCategoryDto) {
    return this.handle(this.manageCategoriesUseCase.update(request.user.id, categoryId, dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder category' })
  @ApiBody({ type: ReorderCategoryDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @Put('admin/catalog/categories/:categoryId/reorder')
  reorderCategory(@Req() request: AuthenticatedRequest, @Param('categoryId') categoryId: string, @Body() dto: ReorderCategoryDto) {
    return this.handle(this.manageCategoriesUseCase.reorder(request.user.id, categoryId, dto.sortOrder));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate category' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @Delete('admin/catalog/categories/:categoryId')
  deactivateCategory(@Req() request: AuthenticatedRequest, @Param('categoryId') categoryId: string) {
    return this.handle(this.manageCategoriesUseCase.deactivate(request.user.id, categoryId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create listing draft' })
  @ApiBody({ type: ListingDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Post('sellers/me/listings')
  createListing(@Req() request: AuthenticatedRequest, @Body() dto: ListingDto) {
    return this.handle(this.manageListingsUseCase.create(this.actor(request), dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List seller listings' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Get('sellers/me/listings')
  listSellerListings(@Req() request: AuthenticatedRequest) {
    return this.handle(this.manageListingsUseCase.listMine(this.actor(request)));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit JSON bulk listing import' })
  @ApiBody({ type: BulkImportDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Post('sellers/me/listings/bulk-imports')
  submitBulkImport(@Req() request: AuthenticatedRequest, @Body() dto: BulkImportDto) {
    return this.handle(this.manageBulkImportsUseCase.submit(this.actor(request), dto.items));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List bulk imports' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Get('sellers/me/listings/bulk-imports')
  listBulkImports(@Req() request: AuthenticatedRequest) {
    return this.handle(this.manageBulkImportsUseCase.list(this.actor(request)));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read bulk import result' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Get('sellers/me/listings/bulk-imports/:jobId')
  getBulkImport(@Req() request: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.handle(this.manageBulkImportsUseCase.get(this.actor(request), jobId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read seller listing' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Get('sellers/me/listings/:listingId')
  getSellerListing(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string) {
    return this.handle(this.manageListingsUseCase.getMine(this.actor(request), listingId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update seller listing content and attributes' })
  @ApiBody({ type: UpdateListingDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Put('sellers/me/listings/:listingId')
  updateListing(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string, @Body() dto: UpdateListingDto) {
    return this.handle(this.manageListingsUseCase.update(this.actor(request), listingId, dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add listing variant' })
  @ApiBody({ type: ListingVariantDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Post('sellers/me/listings/:listingId/variants')
  addVariant(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string, @Body() dto: ListingVariantDto) {
    return this.handle(this.manageVariantsUseCase.add(this.actor(request), listingId, dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing variant' })
  @ApiBody({ type: UpdateListingVariantDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Put('sellers/me/listings/:listingId/variants/:variantId')
  updateVariant(
    @Req() request: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateListingVariantDto
  ) {
    return this.handle(this.manageVariantsUseCase.update(this.actor(request), listingId, variantId, dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete listing variant' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Delete('sellers/me/listings/:listingId/variants/:variantId')
  deleteVariant(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string, @Param('variantId') variantId: string) {
    return this.handle(this.manageVariantsUseCase.delete(this.actor(request), listingId, variantId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload listing media through mock storage' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Post('sellers/me/listings/:listingId/media')
  uploadMedia(
    @Req() request: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Body() dto: UploadMediaDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.handle(this.manageMediaUseCase.upload(this.actor(request), listingId, { ...dto, file }));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List listing media' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Get('sellers/me/listings/:listingId/media')
  listMedia(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string) {
    return this.handle(this.manageMediaUseCase.list(this.actor(request), listingId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing media metadata' })
  @ApiBody({ type: UpdateMediaDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Put('sellers/me/listings/:listingId/media/:mediaId')
  updateMedia(
    @Req() request: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Param('mediaId') mediaId: string,
    @Body() dto: UpdateMediaDto
  ) {
    return this.handle(this.manageMediaUseCase.update(this.actor(request), listingId, mediaId, dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete listing media' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Delete('sellers/me/listings/:listingId/media/:mediaId')
  deleteMedia(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string, @Param('mediaId') mediaId: string) {
    return this.handle(this.manageMediaUseCase.delete(this.actor(request), listingId, mediaId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set primary listing media' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Put('sellers/me/listings/:listingId/media/:mediaId/primary')
  setPrimaryMedia(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string, @Param('mediaId') mediaId: string) {
    return this.handle(this.manageMediaUseCase.setPrimary(this.actor(request), listingId, mediaId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit listing for moderation' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Put('sellers/me/listings/:listingId/submit-for-review')
  submitForReview(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string) {
    return this.handle(this.manageListingLifecycleUseCase.submitForReview(this.actor(request), listingId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause listing' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Put('sellers/me/listings/:listingId/pause')
  pauseListing(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string) {
    return this.handle(this.manageListingLifecycleUseCase.pause(this.actor(request), listingId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive listing' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('SELLER')
  @Put('sellers/me/listings/:listingId/archive')
  archiveListing(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string) {
    return this.handle(this.manageListingLifecycleUseCase.archive(this.actor(request), listingId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate listing' })
  @ApiBody({ type: ModerationDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @Put('admin/catalog/listings/:listingId/moderation')
  moderateListing(@Req() request: AuthenticatedRequest, @Param('listingId') listingId: string, @Body() dto: ModerationDto) {
    return this.handle(this.manageModerationUseCase.moderate(request.user.id, listingId, dto));
  }

  @ApiOperation({ summary: 'Read public product detail' })
  @Get('catalog/listings/:listingId')
  getPublicListing(@Param('listingId') listingId: string) {
    return this.handle(this.getPublicListingUseCase.execute(listingId));
  }

  private actor(request: AuthenticatedRequest): CatalogActor {
    return {
      authUserId: request.user.id,
      email: request.user.email,
      roles: request.user.roles
    };
  }

  private async handle<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      mapCatalogError(error);
    }
  }
}
