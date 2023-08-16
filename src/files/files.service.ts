import {
	BadRequestException,
	Injectable,
	NotFoundException,
	StreamableFile
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { path } from 'app-root-path'
import * as encoding from 'encoding-japanese'
import { type Response } from 'express'
import * as fs from 'fs'
import { createReadStream } from 'fs'
import { ensureDir, writeFile } from 'fs-extra'
import { extname } from 'path'
import { PaginationService } from 'src/pagination/pagination.service'
import { UserEntity } from 'src/users/entities/user.entity'
import {
	FindOptionsOrder,
	ILike,
	In,
	IsNull,
	Like,
	Not,
	Repository
} from 'typeorm'
import * as uuid from 'uuid'
import { UsersService } from '../users/users.service'
import { EnumFileSort, GetAllFilesDto } from './dto/get-file.dto'
import { FileEntity } from './entities/file.entity'

@Injectable()
export class FilesService {
	constructor(
		@InjectRepository(FileEntity)
		private fileRepository: Repository<FileEntity>,
		@InjectRepository(UserEntity)
		private userRepository: Repository<UserEntity>,
		private readonly usersService: UsersService,
		private readonly paginationService: PaginationService
	) {}

	async findById(fileId: number) {
		const file = await this.fileRepository.findOne({
			where: {
				id: fileId
			},
			relations: {
				user: true
			}
		})

		if (!file) throw new NotFoundException('The file is not found!')

		return file
	}

	async getSharedByFilename(filename: string) {
		const file = await this.fileRepository.findOne({
			where: {
				filename: filename,
				isShared: true
			},
			relations: {
				user: true
			}
		})

		if (!file) throw new NotFoundException('The file is not found!')

		return this.getFileData(file)
	}

	async getFile(id: number, fileId: number) {
		const file = await this.findById(fileId)

		if (!file || file.user.id !== id)
			throw new NotFoundException('The file is not found!')

		return this.getFileData(file)
	}

	async getFiles(id: number, dto: GetAllFilesDto) {
		const { perPage, skip } = this.paginationService.getPagination(dto)

		const filters = this.createFilter(dto)

		const files = await this.fileRepository.find({
			where: { user: { id }, ...filters },
			order: this.getSortOption(dto.sort),
			withDeleted: filters.deletedAt ? true : false,
			skip,
			take: perPage,
			relations: {
				user: true
			}
		})

		return {
			files,
			quantity: await this.fileRepository.count({
				where: { user: { id }, ...filters },
				withDeleted: filters.deletedAt ? true : false
			})
		}
	}

	async downloadFile(id: number, fileId: number, response: Response) {
		const user = await this.usersService.findById(id)
		const file = await this.findById(fileId)

		if (user.id !== file.user.id && file.isShared)
			throw new BadRequestException('You do not have such file!')

		const path = this.getPath(file)

		if (!fs.existsSync(path)) throw new BadRequestException('Undefined!')

		const fileItem = createReadStream(path)

		response.set({
			'Content-Disposition': `attachment; filename="${file.filename}"`
		})

		return new StreamableFile(fileItem)
	}

	async createFile(file: Express.Multer.File, id: number) {
		const user = await this.usersService.findById(id)
		return this.uploadFile(user, file)
	}

	async createFiles(files: Array<Express.Multer.File>, id: number) {
		const user = await this.usersService.findById(id)

		let fileItems = []
		for (const file of files) {
			const fileItem = await this.uploadFile(user, file)
			fileItems.push(fileItem)
		}

		return fileItems
	}

	async toggleShared(id: number, fileId: number) {
		const user = await this.usersService.findById(id)
		const file = await this.fileRepository.findOne({
			where: {
				id: fileId,
				user: {
					id: user.id
				}
			}
		})

		if (!file) throw new NotFoundException('The file is not found!')

		file.isShared = !file.isShared

		return this.fileRepository.save(file)
	}

	async restoreFile(id: number, fileId: number) {
		const user = await this.usersService.findById(id)

		const restoredFile = await this.fileRepository
			.createQueryBuilder('file')
			.withDeleted()
			.restore()
			.where('id = :id AND user_id = :userId', { id: fileId, userId: user.id })
			.execute()

		if (!restoredFile) throw new NotFoundException('The file is not found!')

		return restoredFile
	}

	async removeFile(id: number, ids: string) {
		const idsArray = ids.split(',')

		const qb = this.fileRepository.createQueryBuilder('file')

		qb.where('id IN (:...ids) AND user_id = :id', {
			ids: idsArray,
			id
		})

		return qb.softDelete().execute()
	}

	async deletePermanent(id: number, ids: string) {
		const idsArray = ids.split(',')

		const files = await this.fileRepository.find({
			where: {
				id: In(idsArray),
				user: {
					id
				}
			},
			withDeleted: true
		})

		if (idsArray.length !== files.length)
			throw new BadRequestException('Some files is not found!')

		for (const file of files) {
			this.deleteFile(file)
		}

		return this.fileRepository.remove(files)
	}

	private getFileData(file: FileEntity) {
		if (!this.checkTextFile(file)) return file

		const filePath = this.getPath(file)

		if (!fs.existsSync(filePath)) {
			return file
		}

		const fileBuffer = fs.readFileSync(filePath)
		const fileEncoding = String(encoding.detect(fileBuffer))

		if (!Buffer.isEncoding(fileEncoding)) return file

		const text = fs.readFileSync(filePath, {
			encoding: fileEncoding,
			flag: 'r'
		})

		return { ...file, content: text }
	}

	private checkTextFile(file: FileEntity) {
		if (file.mimetype.includes('text/')) {
			return true
		} else {
			return false
		}
	}

	getSortOption(sort: EnumFileSort): FindOptionsOrder<FileEntity> {
		switch (sort) {
			case EnumFileSort.OLDEST:
				return { createdAt: 'asc' }
			default:
				return { createdAt: 'desc' }
		}
	}

	private createFilter(dto: GetAllFilesDto) {
		const filters: { [k: string]: any } = {}

		if (dto.searchTerm) filters.originalName = ILike(`%${dto.searchTerm}%`)

		if (dto.mimetype) filters.mimetype = Like(`%${dto.mimetype}%`)

		if (dto.isShared) filters.isShared = dto.isShared

		if (dto.isDeleted) filters.deletedAt = Not(IsNull())

		return filters
	}

	private async uploadFile(user: UserEntity, file: Express.Multer.File) {
		if (user.usedSpace + file.size > user.diskSpace)
			throw new BadRequestException('There no space on the disk!')

		let filename = uuid.v4() + extname(file.originalname)
		let filePath = `${user.id}/${filename}`

		let root = `${path}/uploads/${filePath}`

		if (fs.existsSync(root))
			throw new BadRequestException('File already exists!')

		user.usedSpace = user.usedSpace + file.size

		await ensureDir(`${path}/uploads/${user.id}`)
		await writeFile(root, file.buffer)

		const savedFile = await this.fileRepository.save({
			filename: filename,
			originalName: file.originalname,
			size: file.size,
			path: filePath,
			mimetype: file.mimetype,
			user: { id: user.id }
		})

		await this.userRepository.save(user)

		return savedFile
	}

	private deleteFile(file: FileEntity) {
		const path = this.getPath(file)
		fs.unlinkSync(path)
	}

	private getPath(file: FileEntity) {
		return `${path}/uploads/${file.path}`
	}
}
