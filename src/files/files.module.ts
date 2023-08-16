import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PaginationService } from 'src/pagination/pagination.service'
import { UserEntity } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { FileEntity } from './entities/file.entity'
import { FilesController } from './files.controller'
import { FilesService } from './files.service'

@Module({
	controllers: [FilesController],
	providers: [FilesService, UsersService, PaginationService],
	exports: [FilesService],
	imports: [TypeOrmModule.forFeature([UserEntity, FileEntity])]
})
export class FilesModule {}
