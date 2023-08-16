import {
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	MaxFileSizeValidator,
	Param,
	ParseFilePipe,
	Patch,
	Post,
	Query,
	Res,
	UploadedFile,
	UploadedFiles,
	UseInterceptors,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiProduces,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Response } from 'express'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CurrentUser } from '../users/decorators/users.decorator'
import { GetAllFilesDto } from './dto/get-file.dto'
import { FilesService } from './files.service'

@Controller('files')
@ApiTags('files')
export class FilesController {
	constructor(private readonly filesService: FilesService) {}

	@UsePipes(new ValidationPipe())
	@Get()
	@Auth()
	@ApiBearerAuth()
	async getFiles(
		@CurrentUser('id') id: number,
		@Query() queryDto: GetAllFilesDto
	) {
		return this.filesService.getFiles(id, queryDto)
	}

	@Get('file/:fileId')
	@Auth()
	@ApiBearerAuth()
	async getFile(
		@CurrentUser('id') id: number,
		@Param('fileId') fileId: string
	) {
		return this.filesService.getFile(id, +fileId)
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
	async downloadFile(
		@CurrentUser('id') id: number,
		@Param('id') fileId: string,
		@Res({ passthrough: true }) response: Response
	) {
		return this.filesService.downloadFile(id, +fileId, response)
	}

	@Get(':filename')
	async getPublic(@Param('filename') filename: string) {
		return this.filesService.getSharedByFilename(filename)
	}

	@HttpCode(200)
	@Patch('toggle-shared/:fileId')
	@Auth()
	@ApiBearerAuth()
	async toggleShared(
		@CurrentUser('id') id: number,
		@Param('fileId') fileId: string
	) {
		return this.filesService.toggleShared(id, +fileId)
	}

	@HttpCode(200)
	@Patch(':id')
	@Auth()
	@ApiBearerAuth()
	async restoreFile(
		@CurrentUser('id') id: number,
		@Param('id') fileId: string
	) {
		return this.filesService.restoreFile(id, +fileId)
	}

	@HttpCode(200)
	@Post()
	@Auth()
	@ApiBearerAuth()
	@UseInterceptors(FileInterceptor('file'))
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				file: {
					type: 'string',
					format: 'binary'
				}
			}
		}
	})
	async createFile(
		@UploadedFile(
			new ParseFilePipe({
				validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 512 })]
			})
		)
		file: Express.Multer.File,
		@CurrentUser('id') id: number
	) {
		return this.filesService.createFile(file, id)
	}

	@HttpCode(200)
	@Post('multiple')
	@Auth()
	@ApiBearerAuth()
	@UseInterceptors(
		FilesInterceptor('files', 5, {
			limits: {
				fileSize: 1024 * 1024 * 512
			}
		})
	)
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				file: {
					type: 'string',
					format: 'binary'
				}
			}
		}
	})
	async createFiles(
		@UploadedFiles()
		files: Array<Express.Multer.File>,
		@CurrentUser('id') id: number
	) {
		return this.filesService.createFiles(files, id)
	}

	@HttpCode(200)
	@Delete()
	@Auth()
	@ApiBearerAuth()
	async removeFile(@CurrentUser('id') id: number, @Query('ids') ids: string) {
		return this.filesService.removeFile(id, ids)
	}

	@HttpCode(200)
	@Delete('/permanent')
	@Auth()
	@ApiBearerAuth()
	async deletePermanent(
		@CurrentUser('id') id: number,
		@Query('ids') ids: string
	) {
		return this.filesService.deletePermanent(id, ids)
	}
}
