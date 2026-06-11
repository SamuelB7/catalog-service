import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  attributeSchema?: Record<string, unknown>;
}

export class UpdateCategoryDto extends PartialType(CategoryDto) {}

export class ReorderCategoryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;
}
