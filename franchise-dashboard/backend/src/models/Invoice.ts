import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  Generated,
} from 'typeorm';
import { Company } from './Company';
import { Deposit } from './Deposit';

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  SENT = 'sent',
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
@Index(['invoiceNumber'], { unique: true })
@Index(['companyId', 'billingMonth'])
@Index(['status', 'dueDate'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Generated('increment')
  invoiceNumber: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.invoices)
  company: Company;

  @Column({ type: 'varchar', length: 7 }) // Format: YYYY-MM
  billingMonth: string;

  @Column({ type: 'jsonb', default: '[]' })
  items: Array<{
    id: string;
    caseNumber?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    category: 'commission' | 'fee' | 'adjustment' | 'other';
    date?: Date;
  }>;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  adjustmentAmount: number;

  @Column({ type: 'text', nullable: true })
  adjustmentReason?: string;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ type: 'timestamp' })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  issuedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  paidAmount: number;

  @OneToMany(() => Deposit, (deposit) => deposit.invoice)
  deposits: Deposit[];

  @Column({ type: 'jsonb', default: '[]' })
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: Date;
    method: 'bank_transfer' | 'credit_card' | 'cash' | 'other';
    reference?: string;
    notes?: string;
    recordedBy: string;
    recordedAt: Date;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  reminder?: {
    count: number;
    lastSentAt?: Date;
    nextScheduledAt?: Date;
    history: Array<{
      sentAt: Date;
      method: 'email' | 'sms' | 'phone';
      sentBy: string;
      response?: string;
    }>;
  };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  internalNotes?: string;

  @Column({ type: 'jsonb', nullable: true })
  billingDetails?: {
    companyName: string;
    address: {
      postalCode: string;
      prefecture: string;
      city: string;
      street: string;
      building?: string;
    };
    contactPerson: string;
    email: string;
    phone: string;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdfUrl?: string;

  @Column({ type: 'timestamp', nullable: true })
  pdfGeneratedAt?: Date;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  lockedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  calculateTotals(): void {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.tax = Math.floor(this.subtotal * 0.1); // 10% tax
    this.total = this.subtotal + this.tax + this.adjustmentAmount;
  }

  updatePaymentStatus(): void {
    const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
    this.paidAmount = totalPaid;

    if (totalPaid === 0) {
      this.status = this.dueDate < new Date() ? InvoiceStatus.OVERDUE : InvoiceStatus.UNPAID;
    } else if (totalPaid < this.total) {
      this.status = InvoiceStatus.PARTIALLY_PAID;
    } else {
      this.status = InvoiceStatus.PAID;
      this.paidAt = this.payments[this.payments.length - 1]?.paymentDate;
    }
  }

  addPayment(payment: {
    amount: number;
    method: 'bank_transfer' | 'credit_card' | 'cash' | 'other';
    reference?: string;
    notes?: string;
    userId: string;
  }): void {
    this.payments.push({
      id: crypto.randomUUID(),
      amount: payment.amount,
      paymentDate: new Date(),
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      recordedBy: payment.userId,
      recordedAt: new Date(),
    });

    this.updatePaymentStatus();
  }

  isOverdue(): boolean {
    return this.status === InvoiceStatus.UNPAID && this.dueDate < new Date();
  }

  getDaysOverdue(): number {
    if (!this.isOverdue()) return 0;
    const diff = Date.now() - this.dueDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getOutstandingAmount(): number {
    return this.total - this.paidAmount;
  }
}