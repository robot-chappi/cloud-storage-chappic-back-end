import {
	Injectable,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { compare, genSalt, hash } from 'bcryptjs'
import { Repository } from 'typeorm'
import { UserEntity } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { AuthDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
		private readonly jwtService: JwtService,
		private readonly usersService: UsersService
	) {}

	async login(dto: AuthDto) {
		const user = await this.validateUser(dto)

		return {
			user: this.returnUserFields(user),
			accessToken: await this.issueAccessToken(user.id)
		}
	}

	async register(dto: AuthDto) {
		await this.usersService.checkByEmail(dto.email)

		const salt = await genSalt(10)

		const newUser = await this.userRepository.create({
			email: dto.email,
			fullname: dto.fullname,
			password: await hash(dto.password, salt)
		})

		const user = await this.userRepository.save(newUser)

		return {
			user: this.returnUserFields(user),
			accessToken: await this.issueAccessToken(user.id)
		}
	}

	async validateUser(dto: AuthDto) {
		const user = await this.userRepository.findOne({
			where: {
				email: dto.email,
				fullname: dto.fullname
			},
			select: ['id', 'email', 'password', 'fullname']
		})

		if (!user) throw new NotFoundException('Пользователь не найден!')

		const isValidPassword = await compare(dto.password, user.password)

		if (!isValidPassword) throw new UnauthorizedException('Не верный пароль')

		return user
	}

	async issueAccessToken(userId: number) {
		const data = {
			id: userId
		}

		return await this.jwtService.signAsync(data, {
			expiresIn: '31d'
		})
	}

	private returnUserFields(user: UserEntity) {
		return {
			id: user.id,
			email: user.email,
			fullname: user.fullname
		}
	}
}
