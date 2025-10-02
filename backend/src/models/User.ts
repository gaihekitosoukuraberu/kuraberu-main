import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import bcrypt from 'bcrypt';
import { Company } from './Company';
import { Case } from './Case';
import { CancelRequest } from './CancelRequest';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['companyId', 'isActive'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.OPERATOR,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  lastLoginIp?: string;

  @Column({ type: 'integer', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'uuid', nullable: true })
  companyId?: string;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true })
  company?: Company;

  @OneToMany(() => Case, (case_) => case_.createdBy)
  createdCases: Case[];

  @OneToMany(() => CancelRequest, (request) => request.processedBy)
  processedCancelRequests: CancelRequest[];

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      browser?: boolean;
    };
    dashboard?: {
      defaultView?: string;
      refreshInterval?: number;
    };
  };

  @Column({ type: 'text', array: true, default: '{}' })
  refreshTokens: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  isLocked(): boolean {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  incrementFailedAttempts(): void {
    this.failedLoginAttempts++;
    if (this.failedLoginAttempts >= 5) {
      const lockDuration = 15 * 60 * 1000; // 15 minutes
      this.lockedUntil = new Date(Date.now() + lockDuration);
    }
  }

  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
  }

  hasPermission(action: string): boolean {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: ['*'],
      [UserRole.MANAGER]: [
        'cases:read',
        'cases:write',
        'cases:assign',
        'sales:read',
        'sales:write',
        'notifications:send',
      ],
      [UserRole.OPERATOR]: [
        'cases:read',
        'cases:write',
        'notifications:send',
      ],
    };

    const userPermissions = permissions[this.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(action);
  }

  toJSON() {
    const { password, refreshTokens, ...user } = this;
    return user;
  }
}