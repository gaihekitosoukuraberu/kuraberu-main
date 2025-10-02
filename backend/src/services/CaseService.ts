import { Repository, FindOptionsWhere, Like, In, Between } from 'typeorm';
import { Case, CaseStatus, PropertyType, Urgency } from '../models/Case';
import { Company } from '../models/Company';
import { SalesAccount } from '../models/SalesAccount';
import { User } from '../models/User';
import { AppDataSource } from '../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { NotificationService } from './NotificationService';
import { EventEmitter } from 'events';

interface CaseCreateData {
  customerName: string;
  phoneNumber: string;
  email?: string;
  address: {
    prefecture: string;
    city: string;
    street: string;
    building?: string;
  };
  propertyType: PropertyType;
  propertyArea?: number;
  propertyAge?: number;
  propertyFloors?: string;
  budget?: string;
  urgency?: Urgency;
  notes?: string;
  source?: string;
  referralSource?: string;
  autoAssign?: boolean;
}

interface CaseUpdateData {
  status?: CaseStatus;
  notes?: string;
  internalNotes?: string;
  tags?: string[];
}

interface CaseFilter {
  status?: CaseStatus | CaseStatus[];
  companyId?: string;
  salesAccountId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  urgency?: Urgency;
  propertyType?: PropertyType;
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class CaseService extends EventEmitter {
  private caseRepository: Repository<Case>;
  private companyRepository: Repository<Company>;
  private salesAccountRepository: Repository<SalesAccount>;
  private userRepository: Repository<User>;
  private notificationService: NotificationService;

  constructor() {
    super();
    this.caseRepository = AppDataSource.getRepository(Case);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.salesAccountRepository = AppDataSource.getRepository(SalesAccount);
    this.userRepository = AppDataSource.getRepository(User);
    this.notificationService = new NotificationService();
  }

  async createCase(data: CaseCreateData, userId: string): Promise<Case> {
    const newCase = this.caseRepository.create({
      ...data,
      createdById: userId,
      status: CaseStatus.PENDING_ASSIGNMENT,
      statusHistory: [{
        previousStatus: null,
        newStatus: CaseStatus.PENDING_ASSIGNMENT,
        changedAt: new Date(),
        changedBy: userId,
        comment: 'Case created',
      }],
    });

    const savedCase = await this.caseRepository.save(newCase);

    // Auto-assign if requested
    if (data.autoAssign) {
      try {
        await this.autoAssignCase(savedCase.id);
      } catch (error) {
        console.error('Auto-assignment failed:', error);
      }
    }

    // Emit event for real-time updates
    this.emit('case:created', savedCase);

    return savedCase;
  }

  async updateCase(id: string, data: CaseUpdateData, userId: string): Promise<Case> {
    const existingCase = await this.caseRepository.findOne({
      where: { id },
      relations: ['assignedCompany', 'salesAccount'],
    });

    if (!existingCase) {
      throw new NotFoundError('Case not found');
    }

    // Handle status change
    if (data.status && data.status !== existingCase.status) {
      if (!existingCase.canTransitionTo(data.status)) {
        throw new ValidationError(
          `Cannot transition from ${existingCase.status} to ${data.status}`
        );
      }

      existingCase.updateStatus(data.status, userId);
      
      // Send notifications for status change
      await this.notificationService.sendCaseStatusNotification(
        existingCase,
        data.status
      );
    }

    // Update other fields
    Object.assign(existingCase, data);
    existingCase.version++; // Optimistic locking

    const updatedCase = await this.caseRepository.save(existingCase);
    
    this.emit('case:updated', updatedCase);
    
    return updatedCase;
  }

  async getCaseById(id: string): Promise<Case> {
    const caseEntity = await this.caseRepository.findOne({
      where: { id },
      relations: ['assignedCompany', 'salesAccount', 'createdBy'],
    });

    if (!caseEntity) {
      throw new NotFoundError('Case not found');
    }

    return caseEntity;
  }

  async getCases(
    filter: CaseFilter,
    pagination: PaginationOptions
  ): Promise<{ data: Case[]; total: number; page: number; totalPages: number }> {
    const where: FindOptionsWhere<Case> = {};

    // Build filter conditions
    if (filter.status) {
      where.status = Array.isArray(filter.status) 
        ? In(filter.status) 
        : filter.status;
    }

    if (filter.companyId) {
      where.assignedCompanyId = filter.companyId;
    }

    if (filter.salesAccountId) {
      where.salesAccountId = filter.salesAccountId;
    }

    if (filter.urgency) {
      where.urgency = filter.urgency;
    }

    if (filter.propertyType) {
      where.propertyType = filter.propertyType;
    }

    if (filter.dateFrom && filter.dateTo) {
      where.createdAt = Between(filter.dateFrom, filter.dateTo);
    }

    // Search in customer name or phone number
    const searchConditions = [];
    if (filter.search) {
      searchConditions.push(
        { ...where, customerName: Like(`%${filter.search}%`) },
        { ...where, phoneNumber: Like(`%${filter.search}%`) }
      );
    }

    const [cases, total] = await this.caseRepository.findAndCount({
      where: searchConditions.length > 0 ? searchConditions : where,
      relations: ['assignedCompany', 'salesAccount'],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      order: {
        [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'DESC',
      },
    });

    return {
      data: cases,
      total,
      page: pagination.page,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async assignCase(
    caseId: string,
    companyId: string,
    salesAccountId: string,
    userId: string,
    assignmentNote?: string
  ): Promise<Case> {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
    });

    if (!caseEntity) {
      throw new NotFoundError('Case not found');
    }

    if (caseEntity.status !== CaseStatus.PENDING_ASSIGNMENT && 
        caseEntity.status !== CaseStatus.ASSIGNED) {
      throw new ValidationError('Case cannot be assigned in current status');
    }

    // Validate company and sales account
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company || !company.canAcceptNewCases()) {
      throw new ValidationError('Company cannot accept new cases');
    }

    const salesAccount = await this.salesAccountRepository.findOne({
      where: { id: salesAccountId },
    });

    if (!salesAccount || !salesAccount.canAcceptCase(
      caseEntity.address.prefecture,
      caseEntity.propertyType
    )) {
      throw new ValidationError('Sales account cannot accept this case');
    }

    // Record reassignment if already assigned
    if (caseEntity.assignedCompanyId) {
      caseEntity.reassignmentHistory.push({
        fromCompanyId: caseEntity.assignedCompanyId,
        toCompanyId: companyId,
        fromAccountId: caseEntity.salesAccountId,
        toAccountId: salesAccountId,
        reassignedAt: new Date(),
        reassignedBy: userId,
        reason: assignmentNote || 'Manual reassignment',
      });
      caseEntity.assignmentMethod = 'reassigned';
    } else {
      caseEntity.assignmentMethod = 'manual';
    }

    // Update assignment
    caseEntity.assignedCompanyId = companyId;
    caseEntity.salesAccountId = salesAccountId;
    caseEntity.assignedAt = new Date();
    
    // Update status
    caseEntity.updateStatus(CaseStatus.ASSIGNED, userId, assignmentNote);

    // Update sales account metrics
    salesAccount.lastAssignedAt = new Date();
    salesAccount.updateMetrics();
    await this.salesAccountRepository.save(salesAccount);

    const updatedCase = await this.caseRepository.save(caseEntity);

    // Send assignment notification
    await this.notificationService.sendCaseAssignmentNotification(
      updatedCase,
      company,
      salesAccount
    );

    this.emit('case:assigned', updatedCase);

    return updatedCase;
  }

  async autoAssignCase(caseId: string): Promise<Case> {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
    });

    if (!caseEntity) {
      throw new NotFoundError('Case not found');
    }

    // Find eligible sales accounts
    const eligibleAccounts = await this.salesAccountRepository.find({
      where: {
        status: 'active',
        isActive: true,
      },
      relations: ['company'],
    });

    // Filter and score accounts
    const scoredAccounts = eligibleAccounts
      .filter(account => 
        account.canAcceptCase(caseEntity.address.prefecture, caseEntity.propertyType)
      )
      .map(account => ({
        account,
        score: account.calculatePriority(caseEntity.urgency, caseEntity.address.prefecture),
      }))
      .sort((a, b) => b.score - a.score);

    if (scoredAccounts.length === 0) {
      throw new ValidationError('No eligible sales accounts found for auto-assignment');
    }

    // Assign to highest scoring account
    const selected = scoredAccounts[0];
    
    return this.assignCase(
      caseId,
      selected.account.companyId,
      selected.account.id,
      'system',
      'Auto-assigned based on availability and performance'
    );
  }

  async addContactLog(
    caseId: string,
    contactInfo: {
      contactType: 'phone' | 'email' | 'line' | 'visit';
      notes: string;
      nextAction?: string;
    },
    userId: string
  ): Promise<Case> {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
    });

    if (!caseEntity) {
      throw new NotFoundError('Case not found');
    }

    caseEntity.contactLog.push({
      contactedAt: new Date(),
      contactedBy: userId,
      ...contactInfo,
    });

    const updatedCase = await this.caseRepository.save(caseEntity);
    
    this.emit('case:contact-logged', updatedCase);
    
    return updatedCase;
  }

  async scheduleHearing(
    caseId: string,
    hearingInfo: {
      scheduledAt: Date;
      location?: string;
      attendees?: string[];
      notes?: string;
    },
    userId: string
  ): Promise<Case> {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
      relations: ['assignedCompany', 'salesAccount'],
    });

    if (!caseEntity) {
      throw new NotFoundError('Case not found');
    }

    caseEntity.hearingInfo = {
      ...hearingInfo,
      scheduledAt: hearingInfo.scheduledAt,
    };

    // Update status to hearing scheduled
    caseEntity.updateStatus(
      CaseStatus.HEARING_SCHEDULED,
      userId,
      `Hearing scheduled for ${hearingInfo.scheduledAt}`
    );

    const updatedCase = await this.caseRepository.save(caseEntity);

    // Send hearing notification
    await this.notificationService.sendHearingScheduledNotification(
      updatedCase,
      hearingInfo.scheduledAt
    );

    this.emit('case:hearing-scheduled', updatedCase);

    return updatedCase;
  }

  async getCaseStatistics(filter?: CaseFilter): Promise<any> {
    const queryBuilder = this.caseRepository.createQueryBuilder('case');

    if (filter?.companyId) {
      queryBuilder.andWhere('case.assignedCompanyId = :companyId', { 
        companyId: filter.companyId 
      });
    }

    if (filter?.dateFrom && filter?.dateTo) {
      queryBuilder.andWhere('case.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
      });
    }

    const stats = await queryBuilder
      .select('case.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('case.status')
      .getRawMany();

    const totalCases = stats.reduce((sum, s) => sum + parseInt(s.count), 0);
    const contractedCases = stats.find(s => s.status === CaseStatus.CONTRACTED)?.count || 0;

    return {
      totalByStatus: stats.reduce((acc, s) => {
        acc[s.status] = parseInt(s.count);
        return acc;
      }, {}),
      total: totalCases,
      conversionRate: totalCases > 0 ? (contractedCases / totalCases) * 100 : 0,
    };
  }

  async uploadFile(
    caseId: string,
    file: {
      name: string;
      type: string;
      size: number;
      url: string;
    },
    userId: string
  ): Promise<Case> {
    const caseEntity = await this.caseRepository.findOne({
      where: { id: caseId },
    });

    if (!caseEntity) {
      throw new NotFoundError('Case not found');
    }

    if (!caseEntity.files) {
      caseEntity.files = [];
    }

    caseEntity.files.push({
      id: crypto.randomUUID(),
      ...file,
      uploadedAt: new Date(),
      uploadedBy: userId,
    });

    return this.caseRepository.save(caseEntity);
  }
}