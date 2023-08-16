import { IsEmail, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
	@IsEmail()
	email: string

	@IsString()
	fullname: string

	@MinLength(6, {
		message: 'At least 6 characters'
	})
	@IsString()
	password: string
}
