import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ModerationDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT', 'BLOCK', 'REQUEST_CHANGES'] })
  @IsEnum(['APPROVE', 'REJECT', 'BLOCK', 'REQUEST_CHANGES'])
  action!: 'APPROVE' | 'REJECT' | 'BLOCK' | 'REQUEST_CHANGES';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
