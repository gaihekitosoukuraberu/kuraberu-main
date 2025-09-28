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

export enum NotificationChannel {
  SMS = 'SMS',
  LINE = 'LINE',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  READ = 'read',
}

export enum NotificationType {
  CASE_ASSIGNED = 'case_assigned',
  CASE_STATUS_CHANGED = 'case_status_changed',
  HEARING_SCHEDULED = 'hearing_scheduled',
  HEARING_REMINDER = 'hearing_reminder',
  ESTIMATE_READY = 'estimate_ready',
  CONTRACT_SIGNED = 'contract_signed',
  PAYMENT_REMINDER = 'payment_reminder',
  PAYMENT_RECEIVED = 'payment_received',
  CANCEL_REQUEST = 'cancel_request',
  SYSTEM_ALERT = 'system_alert',
  CUSTOM = 'custom',
}

@Entity('notifications')
@Index(['recipient', 'status'])
@Index(['caseId', 'type'])
@Index(['scheduledFor', 'status'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.CUSTOM,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 255 })
  recipient: string; // Email, phone number, or LINE ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipientName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject?: string; // For email

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  templateData?: Record<string, any>; // For template-based messages

  @Column({ type: 'varchar', length: 100, nullable: true })
  templateId?: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'uuid', nullable: true })
  caseId?: string;

  @ManyToOne(() => Case, (case_) => case_.notifications, { nullable: true })
  case?: Case;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId?: string; // ID from SMS/Email/LINE provider

  @Column({ type: 'jsonb', nullable: true })
  providerResponse?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    companyId?: string;
    userId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    category?: string;
    tags?: string[];
    retryCount?: number;
    maxRetries?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor?: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', default: '[]' })
  deliveryAttempts: Array<{
    attemptedAt: Date;
    status: string;
    response?: any;
    error?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  tracking?: {
    opened?: boolean;
    openedAt?: Date;
    clickedLinks?: Array<{
      url: string;
      clickedAt: Date;
    }>;
    unsubscribed?: boolean;
    unsubscribedAt?: Date;
  };

  @Column({ type: 'boolean', default: false })
  requiresConfirmation: boolean;

  @Column({ type: 'boolean', default: false })
  confirmed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'text', nullable: true })
  confirmationCode?: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  markAsSent(externalId?: string, providerResponse?: any): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
    this.externalId = externalId;
    this.providerResponse = providerResponse;
    
    this.deliveryAttempts.push({
      attemptedAt: new Date(),
      status: 'sent',
      response: providerResponse,
    });
  }

  markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  markAsFailed(error: string): void {
    this.status = NotificationStatus.FAILED;
    this.failedAt = new Date();
    this.errorMessage = error;
    
    this.deliveryAttempts.push({
      attemptedAt: new Date(),
      status: 'failed',
      error,
    });
  }

  markAsRead(): void {
    if (this.status === NotificationStatus.DELIVERED) {
      this.status = NotificationStatus.READ;
      this.readAt = new Date();
    }
  }

  shouldRetry(): boolean {
    if (this.status !== NotificationStatus.FAILED) return false;
    
    const maxRetries = this.metadata?.maxRetries || 3;
    const retryCount = this.metadata?.retryCount || 0;
    
    return retryCount < maxRetries;
  }

  incrementRetryCount(): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    
    this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return this.expiresAt < new Date();
  }

  generateConfirmationCode(): string {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.confirmationCode = code;
    return code;
  }

  confirm(code: string): boolean {
    if (this.confirmationCode === code && !this.isExpired()) {
      this.confirmed = true;
      this.confirmedAt = new Date();
      return true;
    }
    return false;
  }
}