import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PaginationDto } from 'src/pagination/dto/pagination.dto'

export enum EnumFileSort {
	NEWEST = 'newest',
	OLDEST = 'oldest'
}

export class GetAllFilesDto extends PaginationDto {
	@IsOptional()
	@IsEnum(EnumFileSort)
	sort?: EnumFileSort

	@IsOptional()
	@IsString()
	searchTerm?: string

	@IsOptional()
	@IsString()
	mimetype?: string

	@IsOptional()
	@IsString()
	isShared?: string

	@IsOptional()
	@IsString()
	isDeleted?: string
}
