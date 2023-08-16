import {
	Column,
	DeleteDateColumn,
	Entity,
	JoinColumn,
	ManyToOne
} from 'typeorm'
import { UserEntity } from '../../users/entities/user.entity'
import { Base } from '../../utils/base'

@Entity('Files')
export class FileEntity extends Base {
	@Column({ unique: true })
	filename: string

	@Column({ name: 'original_name', default: '' })
	originalName: string

	@Column({ default: 0 })
	size: number

	@Column()
	path: string

	@Column()
	mimetype: string

	@Column({ default: false, name: 'is_shared' })
	isShared: boolean

	@ManyToOne(() => UserEntity, user => user.files)
	@JoinColumn({ name: 'user_id' })
	user: UserEntity

	@DeleteDateColumn({ name: 'deleted_at' })
	deletedAt?: Date
}
