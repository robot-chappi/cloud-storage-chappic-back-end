import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { getTypeOrmConfig } from './config/typeorm.config'
import { FilesModule } from './files/files.module'
import { UsersModule } from './users/users.module'
import { PaginationModule } from './pagination/pagination.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: getTypeOrmConfig
		}),
		UsersModule,
		FilesModule,
		AuthModule,
		PaginationModule,
		DocumentsModule
	],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
