import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './User';
import { Case } from './Case';
import { SalesAccount } from './SalesAccount';
import { Invoice } from './Invoice';
import { Deposit } from './Deposit';

export enum CompanyType {
  FRANCHISE = 'franchise',
  PARTNER = 'partner',
  DIRECT = 'direct',
}

export enum CompanyStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  PENDING = 'pending',
}

@Entity('companies')
@Index(['companyCode'], { unique: true })
@Index(['status', 'type'])
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  companyCode: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tradeName?: string;

  @Column({
    type: 'enum',
    enum: CompanyType,
    default: CompanyType.FRANCHISE,
  })
  type: CompanyType;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.PENDING,
  })
  status: CompanyStatus;

  @Column({ type: 'varchar', length: 255 })
  representativeName: string;

  @Column({ type: 'varchar', length: 20 })
  representativePhone: string;

  @Column({ type: 'varchar', length: 255 })
  representativeEmail: string;

  @Column({ type: 'jsonb' })
  address: {
    postalCode: string;
    prefecture: string;
    city: string;
    street: string;
    building?: string;
  };

  @Column({ type: 'jsonb' })
  billingInfo: {
    email: string;
    bankName: string;
    branchName: string;
    accountType: 'ordinary' | 'current';
    accountNumber: string;
    accountHolder: string;
  };

  @Column({ type: 'text', array: true, default: '{}' })
  operatingAreas: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  propertyTypes: string[];

  @Column({ type: 'jsonb', nullable: true })
  businessHours?: {
    weekday: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
    holidays?: { start: string; end: string };
  };

  @Column({ type: 'date', nullable: true })
  establishedDate?: Date;

  @Column({ type: 'integer', nullable: true })
  employeeCount?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  licenseNumber?: string;

  @Column({ type: 'jsonb', nullable: true })
  contractTerms?: {
    commissionRate: number;
    minimumMonthlyFee?: number;
    paymentTerms: number; // days
    contractStartDate: Date;
    contractEndDate?: Date;
    autoRenewal: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics?: {
    totalCases: number;
    activeCases: number;
    completedCases: number;
    conversionRate: number;
    averageContractValue: number;
    totalRevenue: number;
    lastMonthRevenue: number;
    customerSatisfaction?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    autoAssignment: boolean;
    maxCasesPerMonth?: number;
    priorityAreas?: string[];
    notificationChannels?: string[];
    customFields?: Record<string, any>;
  };

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Case, (case_) => case_.assignedCompany)
  assignedCases: Case[];

  @OneToMany(() => SalesAccount, (account) => account.company)
  salesAccounts: SalesAccount[];

  @OneToMany(() => Invoice, (invoice) => invoice.company)
  invoices: Invoice[];

  @OneToMany(() => Deposit, (deposit) => deposit.company)
  deposits: Deposit[];

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  suspendedAt?: Date;

  @Column({ type: 'text', nullable: true })
  suspensionReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  canAcceptNewCases(): boolean {
    if (this.status !== CompanyStatus.ACTIVE) return false;
    if (!this.isActive) return false;
    
    const maxCases = this.settings?.maxCasesPerMonth;
    if (maxCases && this.performanceMetrics?.activeCases >= maxCases) {
      return false;
    }
    
    return true;
  }

  calculateCommission(amount: number): number {
    const rate = this.contractTerms?.commissionRate || 0.1;
    return Math.floor(amount * rate);
  }

  isInOperatingArea(area: string): boolean {
    return this.operatingAreas.includes(area);
  }

  supportsPropertyType(type: string): boolean {
    return this.propertyTypes.includes(type);
  }
}