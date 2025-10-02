import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Case } from './Case';
import { User } from './User';

export enum CancelRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum CancelReason {
  CUSTOMER_REQUEST = 'customer_request',
  DUPLICATE_CASE = 'duplicate_case',
  INVALID_INFO = 'invalid_info',
  OUT_OF_AREA = 'out_of_area',
  NO_CAPACITY = 'no_capacity',
  PRICE_MISMATCH = 'price_mismatch',
  OTHER = 'other',
}

@Entity('cancel_requests')
@Index(['caseId', 'status'])
@Index(['createdAt', 'status'])
export class CancelRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  caseId: string;

  @ManyToOne(() => Case, (case_) => case_.cancelRequests)
  case: Case;

  @Column({
    type: 'enum',
    enum: CancelReason,
    default: CancelReason.OTHER,
  })
  reason: CancelReason;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: CancelRequestStatus,
    default: CancelRequestStatus.PENDING,
  })
  status: CancelRequestStatus;

  @Column({ type: 'uuid' })
  requestedBy: string;

  @Column({ type: 'varchar', length: 50 })
  requestedByRole: string; // 'customer', 'company', 'admin'

  @Column({ type: 'timestamp' })
  requestedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  processedBy?: string;

  @ManyToOne(() => User, (user) => user.processedCancelRequests, { nullable: true })
  processedByUser?: User;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'text', nullable: true })
  processNotes?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    feedback?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  financialImpact?: {
    refundAmount?: number;
    lostRevenue?: number;
    compensationAmount?: number;
    notes?: string;
  };

  @Column({ type: 'boolean', default: false })
  customerNotified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  customerNotifiedAt?: Date;

  @Column({ type: 'boolean', default: false })
  companyNotified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  companyNotifiedAt?: Date;

  @Column({ type: 'jsonb', default: '[]' })
  communicationLog: Array<{
    timestamp: Date;
    type: 'email' | 'phone' | 'sms' | 'internal';
    recipient: string;
    message: string;
    sentBy: string;
  }>;

  @Column({ type: 'integer', default: 0 })
  priority: number; // 0 = low, 1 = normal, 2 = high, 3 = urgent

  @Column({ type: 'timestamp', nullable: true })
  deadline?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  approve(userId: string, notes?: string): void {
    if (this.status !== CancelRequestStatus.PENDING) {
      throw new Error(`Cannot approve request with status ${this.status}`);
    }
    
    this.status = CancelRequestStatus.APPROVED;
    this.processedBy = userId;
    this.processedAt = new Date();
    this.processNotes = notes;
  }

  reject(userId: string, reason: string): void {
    if (this.status !== CancelRequestStatus.PENDING) {
      throw new Error(`Cannot reject request with status ${this.status}`);
    }
    
    this.status = CancelRequestStatus.REJECTED;
    this.processedBy = userId;
    this.processedAt = new Date();
    this.rejectionReason = reason;
  }

  cancel(): void {
    if (this.status !== CancelRequestStatus.PENDING) {
      throw new Error(`Cannot cancel request with status ${this.status}`);
    }
    
    this.status = CancelRequestStatus.CANCELLED;
  }

  addCommunication(communication: {
    type: 'email' | 'phone' | 'sms' | 'internal';
    recipient: string;
    message: string;
    sentBy: string;
  }): void {
    this.communicationLog.push({
      timestamp: new Date(),
      ...communication,
    });
    
    if (communication.recipient === this.customerInfo?.email || 
        communication.recipient === this.customerInfo?.phone) {
      this.customerNotified = true;
      this.customerNotifiedAt = new Date();
    }
  }

  calculatePriority(): number {
    let priority = 0;
    
    // Increase priority based on reason
    if (this.reason === CancelReason.CUSTOMER_REQUEST) priority += 2;
    if (this.reason === CancelReason.DUPLICATE_CASE) priority += 1;
    
    // Increase priority if deadline is approaching
    if (this.deadline) {
      const hoursUntilDeadline = (this.deadline.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDeadline < 24) priority += 2;
      else if (hoursUntilDeadline < 48) priority += 1;
    }
    
    // Increase priority based on financial impact
    if (this.financialImpact?.lostRevenue && this.financialImpact.lostRevenue > 100000) {
      priority += 1;
    }
    
    return Math.min(priority, 3); // Cap at urgent level
  }
}