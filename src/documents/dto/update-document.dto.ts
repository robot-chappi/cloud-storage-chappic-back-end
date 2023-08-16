import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateDocumentDto {
	@IsString()
	filename: string

	@IsString()
	content: string

	@IsOptional()
	@IsBoolean()
	isShared?: boolean

	@IsOptional()
	@IsBoolean()
	isEditable?: boolean
}

export class UpdateDocumentPublicDto {
	@IsString()
	filename: string

	@IsString()
	content: string
}
