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
import { User } from './User';
import { Company } from './Company';
import { SalesAccount } from './SalesAccount';
import { CancelRequest } from './CancelRequest';
import { Notification } from './Notification';

export enum CaseStatus {
  PENDING_ASSIGNMENT = 'pending_assignment',
  ASSIGNED = 'assigned',
  CONTACT_PENDING = 'contact_pending',
  HEARING_SCHEDULED = 'hearing_scheduled',
  HEARING_COMPLETE = 'hearing_complete',
  ESTIMATE_REQUESTED = 'estimate_requested',
  ESTIMATE_RECEIVED = 'estimate_received',
  ESTIMATE_SUBMITTED = 'estimate_submitted',
  CONTRACT_PENDING = 'contract_pending',
  CONTRACTED = 'contracted',
}

export enum PropertyType {
  HOUSE = 'house',
  APARTMENT = 'apartment',
  MANSION = 'mansion',
  STORE = 'store',
  OFFICE = 'office',
  WAREHOUSE = 'warehouse',
  OTHER = 'other',
}

export enum Urgency {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('cases')
@Index(['caseNumber'], { unique: true })
@Index(['status', 'assignedCompanyId'])
@Index(['createdAt', 'status'])
export class Case {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  @Generated('increment')
  caseNumber: string;

  @Column({ type: 'varchar', length: 100 })
  customerName: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'jsonb' })
  address: {
    postalCode?: string;
    prefecture: string;
    city: string;
    street: string;
    building?: string;
  };

  @Column({
    type: 'enum',
    enum: PropertyType,
    default: PropertyType.HOUSE,
  })
  propertyType: PropertyType;

  @Column({ type: 'integer', nullable: true })
  propertyArea?: number; // in square meters

  @Column({ type: 'integer', nullable: true })
  propertyAge?: number; // in years

  @Column({ type: 'varchar', length: 50, nullable: true })
  propertyFloors?: string; // e.g., "1階〜3階"

  @Column({ type: 'varchar', length: 100, nullable: true })
  budget?: string;

  @Column({
    type: 'enum',
    enum: Urgency,
    default: Urgency.NORMAL,
  })
  urgency: Urgency;

  @Column({
    type: 'enum',
    enum: CaseStatus,
    default: CaseStatus.PENDING_ASSIGNMENT,
  })
  status: CaseStatus;

  @Column({ type: 'jsonb', default: '[]' })
  statusHistory: Array<{
    previousStatus: CaseStatus;
    newStatus: CaseStatus;
    changedAt: Date;
    changedBy: string;
    comment?: string;
  }>;

  @Column({ type: 'uuid', nullable: true })
  assignedCompanyId?: string;

  @ManyToOne(() => Company, (company) => company.assignedCases, { nullable: true })
  assignedCompany?: Company;

  @Column({ type: 'uuid', nullable: true })
  salesAccountId?: string;

  @ManyToOne(() => SalesAccount, (account) => account.cases, { nullable: true })
  salesAccount?: SalesAccount;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'varchar', length: 50, default: 'manual' })
  assignmentMethod: 'manual' | 'automatic' | 'reassigned';

  @Column({ type: 'jsonb', default: '[]' })
  reassignmentHistory: Array<{
    fromCompanyId: string;
    toCompanyId: string;
    fromAccountId?: string;
    toAccountId?: string;
    reassignedAt: Date;
    reassignedBy: string;
    reason: string;
  }>;

  @Column({ type: 'jsonb', default: '[]' })
  contactLog: Array<{
    contactedAt: Date;
    contactType: 'phone' | 'email' | 'line' | 'visit';
    contactedBy: string;
    notes: string;
    nextAction?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  hearingInfo?: {
    scheduledAt?: Date;
    completedAt?: Date;
    location?: string;
    attendees?: string[];
    notes?: string;
    requirements?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  estimateInfo?: {
    requestedAt?: Date;
    receivedAt?: Date;
    submittedAt?: Date;
    amount?: number;
    validUntil?: Date;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  contractInfo?: {
    contractedAt?: Date;
    contractAmount?: number;
    startDate?: Date;
    completionDate?: Date;
    paymentTerms?: string;
  };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  internalNotes?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  files?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    uploadedAt: Date;
    uploadedBy: string;
  }>;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, (user) => user.createdCases)
  createdBy: User;

  @OneToMany(() => CancelRequest, (request) => request.case)
  cancelRequests: CancelRequest[];

  @OneToMany(() => Notification, (notification) => notification.case)
  notifications: Notification[];

  @Column({ type: 'jsonb', nullable: true })
  metrics?: {
    timeToAssignment?: number; // in minutes
    timeToFirstContact?: number;
    timeToHearing?: number;
    timeToEstimate?: number;
    timeToContract?: number;
    customerSatisfaction?: number;
  };

  @Column({ type: 'varchar', length: 50, nullable: true })
  source?: string; // e.g., 'web', 'phone', 'referral'

  @Column({ type: 'varchar', length: 100, nullable: true })
  referralSource?: string;

  @Column({ type: 'integer', default: 0 })
  version: number; // For optimistic locking

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  canTransitionTo(newStatus: CaseStatus): boolean {
    const transitions: Record<CaseStatus, CaseStatus[]> = {
      [CaseStatus.PENDING_ASSIGNMENT]: [CaseStatus.ASSIGNED],
      [CaseStatus.ASSIGNED]: [CaseStatus.CONTACT_PENDING],
      [CaseStatus.CONTACT_PENDING]: [CaseStatus.HEARING_SCHEDULED],
      [CaseStatus.HEARING_SCHEDULED]: [CaseStatus.HEARING_COMPLETE],
      [CaseStatus.HEARING_COMPLETE]: [CaseStatus.ESTIMATE_REQUESTED],
      [CaseStatus.ESTIMATE_REQUESTED]: [CaseStatus.ESTIMATE_RECEIVED],
      [CaseStatus.ESTIMATE_RECEIVED]: [CaseStatus.ESTIMATE_SUBMITTED],
      [CaseStatus.ESTIMATE_SUBMITTED]: [CaseStatus.CONTRACT_PENDING, CaseStatus.CONTRACTED],
      [CaseStatus.CONTRACT_PENDING]: [CaseStatus.CONTRACTED],
      [CaseStatus.CONTRACTED]: [],
    };

    return transitions[this.status]?.includes(newStatus) || false;
  }

  updateStatus(newStatus: CaseStatus, userId: string, comment?: string): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }

    this.statusHistory.push({
      previousStatus: this.status,
      newStatus,
      changedAt: new Date(),
      changedBy: userId,
      comment,
    });

    this.status = newStatus;
  }
}