import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Put,
	Query,
	Res,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiProduces,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Response } from 'express'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CurrentUser } from 'src/users/decorators/users.decorator'
import { DocumentsService } from './documents.service'
import { GetAllDocumentsDto } from './dto/get-document.dto'
import {
	UpdateDocumentDto,
	UpdateDocumentPublicDto
} from './dto/update-document.dto'

@Controller('documents')
@ApiTags('documents')
export class DocumentsController {
	constructor(private readonly documentsService: DocumentsService) {}

	@UsePipes(new ValidationPipe())
	@Get()
	@Auth()
	@ApiBearerAuth()
	async getDocuments(
		@CurrentUser('id') id: number,
		@Query() queryDto: GetAllDocumentsDto
	) {
		return this.documentsService.getDocuments(id, queryDto)
	}

	@Get('document/:documentId')
	@Auth()
	@ApiBearerAuth()
	async getDocument(
		@CurrentUser('id') id: number,
		@Param('documentId') documentId: string
	) {
		return this.documentsService.getDocument(id, +documentId)
	}

	@Get('download/:id')
	@Auth()
	@ApiBearerAuth()
	@ApiResponse({
		schema: {
			type: 'string',
			format: 'binary'
		},
		status: HttpStatus.OK
	})
	@ApiProduces('*/*')
	async downloadFileDocument(
		@CurrentUser('id') id: number,
		@Param('id') fileId: string,
		@Res({ passthrough: true }) response: Response
	) {
		return this.documentsService.downloadFileDocument(id, +fileId, response)
	}

	@Get('editable/:securePath')
	async getEditable(@Param('securePath') securePath: string) {
		return this.documentsService.getEditableBySecurePath(securePath)
	}

	@Get(':securePath')
	async getPublic(@Param('securePath') securePath: string) {
		return this.documentsService.getSharedBySecurePath(securePath)
	}

	@HttpCode(200)
	@Patch('save/:id')
	@Auth()
	@ApiBearerAuth()
	async saveFileDocument(
		@CurrentUser('id') id: number,
		@Param('id') documentId: string
	) {
		return this.documentsService.saveFileDocument(id, +documentId)
	}

	@HttpCode(200)
	@Patch(':id')
	@Auth()
	@ApiBearerAuth()
	async restoreDocument(
		@CurrentUser('id') id: number,
		@Param('id') fileId: string
	) {
		return this.documentsService.restoreDocument(id, +fileId)
	}

	@HttpCode(200)
	@Post()
	@Auth()
	@ApiBearerAuth()
	async createDocument(@CurrentUser('id') id: number) {
		return this.documentsService.createDocument(+id)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Put('public/:securePath')
	async updateDocumentPublic(
		@Param('securePath') securePath: string,
		@Body() dto: UpdateDocumentPublicDto
	) {
		return this.documentsService.updateDocumentPublic(securePath, dto)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Put(':id')
	@Auth()
	@ApiBearerAuth()
	async updateDocument(
		@CurrentUser('id') id: number,
		@Param('id') documentId: string,
		@Body() dto: UpdateDocumentDto
	) {
		return this.documentsService.updateDocument(id, +documentId, dto)
	}

	@HttpCode(200)
	@Delete()
	@Auth()
	@ApiBearerAuth()
	async removeDocument(
		@CurrentUser('id') id: number,
		@Query('ids') ids: string
	) {
		return this.documentsService.removeDocument(id, ids)
	}

	@HttpCode(200)
	@Delete('/permanent')
	@Auth()
	@ApiBearerAuth()
	async deletePermanent(
		@CurrentUser('id') id: number,
		@Query('ids') ids: string
	) {
		return this.documentsService.deletePermanent(id, ids)
	}
}
