import {
	Column,
	DeleteDateColumn,
	Entity,
	JoinColumn,
	ManyToOne
} from 'typeorm'
import { UserEntity } from '../../users/entities/user.entity'
import { Base } from '../../utils/base'

@Entity('Documents')
export class DocumentEntity extends Base {
	@Column({ default: '' })
	filename: string

	@Column({ default: '' })
	content: string

	@Column({ default: 0 })
	size: number

	@Column({ default: '' })
	path: string

	@Column({ unique: true })
	securePath: string

	@Column({ default: false, name: 'is_shared' })
	isShared: boolean

	@Column({ default: false, name: 'is_editable' })
	isEditable: boolean

	@ManyToOne(() => UserEntity, user => user.files)
	@JoinColumn({ name: 'user_id' })
	user: UserEntity

	@DeleteDateColumn({ name: 'deleted_at' })
	deletedAt?: Date
}
