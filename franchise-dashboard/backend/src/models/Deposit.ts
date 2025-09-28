import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Company } from './Company';
import { Invoice } from './Invoice';

export enum DepositStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
  CHECK = 'check',
  OTHER = 'other',
}

@Entity('deposits')
@Index(['companyId', 'depositDate'])
@Index(['status', 'createdAt'])
export class Deposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.deposits)
  company: Company;

  @Column({ type: 'uuid', nullable: true })
  invoiceId?: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.deposits, { nullable: true })
  invoice?: Invoice;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  amount: number;

  @Column({ type: 'date' })
  depositDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceNumber?: string;

  @Column({ type: 'jsonb', nullable: true })
  bankDetails?: {
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    depositorName?: string;
    transactionId?: string;
  };

  @Column({
    type: 'enum',
    enum: DepositStatus,
    default: DepositStatus.PENDING,
  })
  status: DepositStatus;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  confirmedBy?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  reconciliation?: {
    matchedAt?: Date;
    matchedBy?: string;
    confidence?: number; // 0-100
    method?: 'automatic' | 'manual';
    discrepancies?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  refundInfo?: {
    refundedAt?: Date;
    refundedBy?: string;
    refundAmount?: number;
    refundMethod?: PaymentMethod;
    refundReason?: string;
    refundReference?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  confirm(userId: string): void {
    if (this.status !== DepositStatus.PENDING) {
      throw new Error(`Cannot confirm deposit with status ${this.status}`);
    }
    
    this.status = DepositStatus.CONFIRMED;
    this.confirmedAt = new Date();
    this.confirmedBy = userId;
  }

  reject(reason: string): void {
    if (this.status !== DepositStatus.PENDING) {
      throw new Error(`Cannot reject deposit with status ${this.status}`);
    }
    
    this.status = DepositStatus.REJECTED;
    this.rejectionReason = reason;
  }

  refund(refundInfo: {
    amount: number;
    method: PaymentMethod;
    reason: string;
    reference?: string;
    userId: string;
  }): void {
    if (this.status !== DepositStatus.CONFIRMED) {
      throw new Error('Can only refund confirmed deposits');
    }
    
    if (refundInfo.amount > this.amount) {
      throw new Error('Refund amount cannot exceed deposit amount');
    }
    
    this.status = DepositStatus.REFUNDED;
    this.refundInfo = {
      refundedAt: new Date(),
      refundedBy: refundInfo.userId,
      refundAmount: refundInfo.amount,
      refundMethod: refundInfo.method,
      refundReason: refundInfo.reason,
      refundReference: refundInfo.reference,
    };
  }

  matchToInvoice(invoiceId: string, confidence: number, userId?: string): void {
    this.invoiceId = invoiceId;
    this.reconciliation = {
      matchedAt: new Date(),
      matchedBy: userId || 'system',
      confidence,
      method: userId ? 'manual' : 'automatic',
    };
  }
}