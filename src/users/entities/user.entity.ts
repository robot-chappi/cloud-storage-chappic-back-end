import { Column, Entity, OneToMany } from 'typeorm'
import { FileEntity } from '../../files/entities/file.entity'
import { Base } from '../../utils/base'

@Entity('Users')
export class UserEntity extends Base {
	@Column({ unique: true })
	email: string

	@Column({ select: false })
	password: string

	@Column({ default: '' })
	fullname: string

	@Column({ name: 'avatar_path', default: '' })
	avatarPath: string

	@Column({ name: 'disk_space', default: 1024 * 1024 * 1024 })
	diskSpace: number

	@Column({ name: 'used_space', default: 0 })
	usedSpace: number

	@OneToMany(() => FileEntity, file => file.user)
	files: FileEntity[]
}
