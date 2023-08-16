import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FileEntity } from 'src/files/entities/file.entity'
import { FilesService } from 'src/files/files.service'
import { PaginationService } from 'src/pagination/pagination.service'
import { UserEntity } from 'src/users/entities/user.entity'
import { UsersService } from 'src/users/users.service'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'
import { DocumentEntity } from './entities/document.entity'

@Module({
	controllers: [DocumentsController],
	providers: [DocumentsService, UsersService, PaginationService, FilesService],
	imports: [TypeOrmModule.forFeature([UserEntity, DocumentEntity, FileEntity])]
})
export class DocumentsModule {}
