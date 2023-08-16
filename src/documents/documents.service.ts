import {
	BadRequestException,
	Injectable,
	NotFoundException,
	StreamableFile
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { path } from 'app-root-path'
import { type Response } from 'express'
import * as fs from 'fs'
import { ensureDir, writeFile } from 'fs-extra'
import { htmlToText } from 'html-to-text'
import { FilesService } from 'src/files/files.service'
import { PaginationService } from 'src/pagination/pagination.service'
import { UserEntity } from 'src/users/entities/user.entity'
import { UsersService } from 'src/users/users.service'
import { ILike, In, IsNull, Not, Repository } from 'typeorm'
import * as uuid from 'uuid'
import { GetAllDocumentsDto } from './dto/get-document.dto'
import {
	UpdateDocumentDto,
	UpdateDocumentPublicDto
} from './dto/update-document.dto'
import { DocumentEntity } from './entities/document.entity'

@Injectable()
export class DocumentsService {
	constructor(
		@InjectRepository(DocumentEntity)
		private documentRepository: Repository<DocumentEntity>,
		@InjectRepository(UserEntity)
		private userRepository: Repository<UserEntity>,
		private readonly usersService: UsersService,
		private readonly paginationService: PaginationService,
		private readonly filesService: FilesService
	) {}

	async findById(documentId: number) {
		const document = await this.documentRepository.findOne({
			where: {
				id: documentId
			},
			relations: {
				user: true
			}
		})

		if (!document) throw new NotFoundException('The document is not found!')

		return document
	}

	async findBySecurePath(securePath: string) {
		const document = await this.documentRepository.findOne({
			where: {
				securePath: securePath
			},
			relations: {
				user: true
			}
		})

		if (!document) throw new NotFoundException('The document is not found!')

		return document
	}

	async getSharedBySecurePath(securePath: string) {
		const document = await this.documentRepository.findOne({
			where: {
				securePath,
				isShared: true
			},
			relations: {
				user: true
			}
		})

		if (!document) throw new NotFoundException('The document is not found!')

		return document
	}

	async getEditableBySecurePath(securePath: string) {
		const document = await this.documentRepository.findOne({
			where: {
				securePath,
				isEditable: true
			},
			relations: {
				user: true
			}
		})

		if (!document) throw new NotFoundException('The document is not found!')

		return document
	}

	async getDocument(id: number, documentId: number) {
		const document = await this.findById(documentId)

		if (!document || document.user.id !== id)
			throw new NotFoundException('The document is not found!')

		return document
	}

	async getDocuments(id: number, dto: GetAllDocumentsDto) {
		const { perPage, skip } = this.paginationService.getPagination(dto)

		const filters = this.createFilter(dto)

		const documents = await this.documentRepository.find({
			where: { user: { id }, ...filters },
			order: this.filesService.getSortOption(dto.sort),
			withDeleted: filters.deletedAt ? true : false,
			skip,
			take: perPage,
			relations: {
				user: true
			}
		})

		return {
			documents,
			quantity: await this.documentRepository.count({
				where: { user: { id }, ...filters },
				withDeleted: filters.deletedAt ? true : false
			})
		}
	}

	async downloadFileDocument(
		id: number,
		documentId: number,
		response: Response
	) {
		const user = await this.usersService.findById(id)
		const document = await this.findById(documentId)

		if (user.id !== document.user.id && document.isShared)
			throw new BadRequestException('You do not have such document!')

		const path = this.getPath(document)

		if (!fs.existsSync(path) && document.path)
			throw new BadRequestException('You did not save your document as file!')

		const documentItem = fs.createReadStream(path)

		response.set({
			'Content-Disposition': `attachment; filename="${document.filename}"`
		})

		return new StreamableFile(documentItem)
	}

	async createDocument(id: number) {
		const user = await this.usersService.findById(id)

		const document = await this.documentRepository.save({
			filename: '',
			content: '',
			size: 0,
			path: '',
			securePath: uuid.v4(),
			isShared: false,
			isEditable: false,
			user: { id: user.id }
		})

		return document.id
	}

	async updateDocument(id: number, documentId: number, dto: UpdateDocumentDto) {
		const user = await this.usersService.findById(id)
		const document = await this.findById(documentId)

		if (document.user.id !== user.id)
			throw new BadRequestException(
				"You cannot update someone else's document!"
			)

		const size = this.getStringByteSize(dto.content)

		return this.documentRepository.save({
			...document,
			filename: dto.filename,
			content: dto.content,
			isShared: dto.isShared,
			isEditable: dto.isEditable,
			size
		})
	}

	async saveFileDocument(id: number, documentId: number) {
		const user = await this.usersService.findById(id)
		const document = await this.findById(documentId)

		return this.createOrUpdateFileDocument(user, document)
	}

	async updateDocumentPublic(securePath: string, dto: UpdateDocumentPublicDto) {
		const document = await this.findBySecurePath(securePath)

		if (!document.isEditable)
			throw new BadRequestException('You cannot update this document!')

		const size = this.getStringByteSize(dto.content)

		return this.documentRepository.save({
			...document,
			filename: dto.filename,
			content: dto.content,
			size
		})
	}

	async restoreDocument(id: number, documentId: number) {
		const user = await this.usersService.findById(id)

		const restoredDocument = await this.documentRepository
			.createQueryBuilder('document')
			.withDeleted()
			.restore()
			.where('id = :id AND user_id = :userId', {
				id: documentId,
				userId: user.id
			})
			.execute()

		if (!restoredDocument)
			throw new NotFoundException('The document is not found!')

		return restoredDocument
	}

	async removeDocument(id: number, ids: string) {
		const idsArray = ids.split(',')

		const qb = this.documentRepository.createQueryBuilder('document')

		qb.where('id IN (:...ids) AND user_id = :id', {
			ids: idsArray,
			id
		})

		return qb.softDelete().execute()
	}

	async deletePermanent(id: number, ids: string) {
		const idsArray = ids.split(',')

		const documents = await this.documentRepository.find({
			where: {
				id: In(idsArray),
				user: {
					id
				}
			},
			withDeleted: true
		})

		if (idsArray.length !== documents.length)
			throw new BadRequestException('Some documents is not found!')

		for (const document of documents) {
			if (fs.existsSync(this.getPath(document)) && document.path)
				this.deleteFileDocument(document)
		}

		return this.documentRepository.remove(documents)
	}

	private createFilter(dto: GetAllDocumentsDto) {
		const filters: { [k: string]: any } = {}

		if (dto.searchTerm) filters.filename = ILike(`%${dto.searchTerm}%`)

		if (dto.isShared) filters.isShared = dto.isShared

		if (dto.isEditable) filters.isEditable = dto.isEditable

		if (dto.isDeleted) filters.deletedAt = Not(IsNull())

		return filters
	}

	private async createOrUpdateFileDocument(
		user: UserEntity,
		document: DocumentEntity
	) {
		if (fs.existsSync(this.getPath(document)) && document.path) {
			if (user.usedSpace + document.size > user.diskSpace)
				throw new BadRequestException('There no space on the disk!')

			await writeFile(
				this.getPath(document),
				this.formatHtmlToText(document.content),
				{
					encoding: 'utf-8'
				}
			)

			return document
		}

		if (user.usedSpace + document.size > user.diskSpace)
			throw new BadRequestException('There no space on the disk!')

		let filename = uuid.v4() + '.txt'
		let filePath = `${user.id}/documents/${filename}`

		let root = `${path}/uploads/${filePath}`

		await ensureDir(`${path}/uploads/${user.id}/documents`)

		await writeFile(root, this.formatHtmlToText(document.content), {
			encoding: 'utf-8'
		})

		const savedDocument = await this.documentRepository.save({
			...document,
			path: filePath
		})

		return savedDocument
	}

	private formatHtmlToText(html: string) {
		const options = {
			preserveNewlines: true,
			uppercaseHeadings: false
		}

		return htmlToText(html, options)
	}

	private getStringByteSize(string: string) {
		const encoder = new TextEncoder()
		const text = this.formatHtmlToText(string)

		const encodedString = encoder.encode(text)

		return encodedString.length
	}

	private deleteFileDocument(document: DocumentEntity) {
		const path = this.getPath(document)
		fs.unlinkSync(path)
	}

	private getPath(document: DocumentEntity) {
		return `${path}/uploads/${document.path}`
	}
}
