import { IsEmail, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AuthDto {
	@ApiProperty({
		default: 'test@test.ru'
	})
	@IsEmail()
	email: string

	@ApiProperty({
		default: 'Mr. John'
	})
	@MinLength(2, {
		message: 'At least 2 characters'
	})
	@IsString()
	fullname: string

	@ApiProperty({
		default: '123456'
	})
	@MinLength(6, {
		message: 'At least 6 characters'
	})
	@IsString()
	password: string
}
