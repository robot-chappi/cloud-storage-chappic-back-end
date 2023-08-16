import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { DocumentEntity } from 'src/documents/entities/document.entity'
import { FileEntity } from '../files/entities/file.entity'
import { UserEntity } from '../users/entities/user.entity'

export const getTypeOrmConfig = async (
	configService: ConfigService
): Promise<TypeOrmModuleOptions> => ({
	type: 'postgres',
	host: 'localhost',
	port: configService.get<number>('PORT'),
	database: configService.get<string>('DATABASE'),
	username: configService.get<string>('USERNAME'),
	password: configService.get<string>('PASSWORD'),
	entities: [UserEntity, FileEntity, DocumentEntity],
	synchronize: true
})
