import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { path } from 'app-root-path'
import * as fs from 'fs'
import { ensureDir, writeFile } from 'fs-extra'
import { extname } from 'path'
import { Repository } from 'typeorm'
import * as uuid from 'uuid'
import { CreateUserDto } from './dto/create-user.dto'
import { UserEntity } from './entities/user.entity'

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
	) {}

	async checkByEmail(email: string) {
		const user = await this.userRepository.findOneBy({
			email
		})

		if (user)
			throw new BadRequestException('Пользователь с таким Email уже существует')

		return user
	}

	async findById(id: number) {
		const user = await this.userRepository.findOneBy({
			id
		})

		if (!user) throw new NotFoundException('Пользователь не найден!')

		return user
	}

	async create(dto: CreateUserDto) {
		return this.userRepository.save(dto)
	}

	async updateAvatar(file: Express.Multer.File, id: number) {
		const user = await this.findById(id)

		if (file.size > 5000000)
			throw new BadRequestException(
				'The size of the avatar must not exceed 5 MB!'
			)

		if (user.avatarPath) {
			fs.unlinkSync(`${path}/uploads/${user.avatarPath}`)
		}

		let filename = uuid.v4() + extname(file.originalname)
		let filePath = `${user.id}/avatar/${filename}`

		let root = `${path}/uploads/${filePath}`

		if (fs.existsSync(root))
			throw new BadRequestException('File already exists!')

		await ensureDir(`${path}/uploads/${user.id}/avatar`)
		await writeFile(root, file.buffer)

		return this.userRepository.save({ ...user, avatarPath: filePath })
	}
}
