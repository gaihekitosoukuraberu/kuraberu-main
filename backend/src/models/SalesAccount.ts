import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Company } from './Company';
import { Case } from './Case';

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('sales_accounts')
@Index(['accountCode'], { unique: true })
@Index(['companyId', 'status'])
export class SalesAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  accountCode: string;

  @Column({ type: 'varchar', length: 255 })
  companyName: string;

  @Column({ type: 'varchar', length: 100 })
  contactPerson: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobileNumber?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  areas: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  propertyTypes: string[];

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status: AccountStatus;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.salesAccounts)
  company: Company;

  @OneToMany(() => Case, (case_) => case_.salesAccount)
  cases: Case[];

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics?: {
    totalCases: number;
    activeCases: number;
    completedCases: number;
    conversionRate: number;
    averageResponseTime: number; // in hours
    customerSatisfaction?: number;
    monthlyRevenue: number;
    lastUpdated: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  availability?: {
    canAcceptNewCases: boolean;
    currentLoad: number;
    maxCapacity: number;
    nextAvailableDate?: Date;
    blockedDates?: Date[];
  };

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    maxCasesPerWeek?: number;
    preferredPropertyTypes?: string[];
    preferredAreas?: string[];
    excludedAreas?: string[];
    autoAssignment: boolean;
    notificationChannels?: ('email' | 'sms' | 'line')[];
  };

  @Column({ type: 'jsonb', nullable: true })
  bankInfo?: {
    bankName: string;
    branchName: string;
    accountType: 'ordinary' | 'current';
    accountNumber: string;
    accountHolder: string;
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  commissionRate: number; // percentage

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastAssignedAt?: Date;

  @Column({ type: 'integer', default: 0 })
  priorityScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  canAcceptCase(area: string, propertyType: string): boolean {
    if (this.status !== AccountStatus.ACTIVE) return false;
    if (!this.isActive) return false;
    if (!this.availability?.canAcceptNewCases) return false;
    
    // Check capacity
    if (this.availability.currentLoad >= this.availability.maxCapacity) {
      return false;
    }
    
    // Check area coverage
    if (!this.areas.includes(area)) return false;
    
    // Check excluded areas
    if (this.preferences?.excludedAreas?.includes(area)) return false;
    
    // Check property type support
    if (!this.propertyTypes.includes(propertyType)) return false;
    
    return true;
  }

  calculatePriority(urgency: string, area: string): number {
    let score = this.priorityScore;
    
    // Boost for preferred areas
    if (this.preferences?.preferredAreas?.includes(area)) {
      score += 10;
    }
    
    // Boost for urgency
    if (urgency === 'urgent') score += 20;
    if (urgency === 'high') score += 10;
    
    // Reduce for high load
    if (this.availability) {
      const loadRatio = this.availability.currentLoad / this.availability.maxCapacity;
      score -= Math.floor(loadRatio * 20);
    }
    
    // Boost for performance
    if (this.performanceMetrics) {
      score += Math.floor(this.performanceMetrics.conversionRate);
      score += Math.floor((this.performanceMetrics.customerSatisfaction || 0) / 10);
    }
    
    return score;
  }

  updateMetrics(): void {
    const activeCases = this.cases.filter(c => 
      !['contracted', 'cancelled'].includes(c.status)
    ).length;
    
    const completedCases = this.cases.filter(c => 
      c.status === 'contracted'
    ).length;
    
    const totalCases = this.cases.length;
    
    this.performanceMetrics = {
      ...this.performanceMetrics,
      totalCases,
      activeCases,
      completedCases,
      conversionRate: totalCases > 0 ? (completedCases / totalCases) * 100 : 0,
      lastUpdated: new Date(),
    };
    
    if (this.availability) {
      this.availability.currentLoad = activeCases;
    }
  }
}