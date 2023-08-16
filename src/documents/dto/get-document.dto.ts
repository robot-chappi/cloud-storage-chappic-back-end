import { IsEnum, IsOptional, IsString } from 'class-validator'
import { EnumFileSort } from 'src/files/dto/get-file.dto'
import { PaginationDto } from 'src/pagination/dto/pagination.dto'

export class GetAllDocumentsDto extends PaginationDto {
	@IsOptional()
	@IsEnum(EnumFileSort)
	sort?: EnumFileSort

	@IsOptional()
	@IsString()
	searchTerm?: string

	@IsOptional()
	@IsString()
	isShared?: string

	@IsOptional()
	@IsString()
	isDeleted?: string

	@IsOptional()
	@IsString()
	isEditable?: string
}
