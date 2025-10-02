import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { CaseService } from '../services/CaseService';
import { Repository } from 'typeorm';
import { Company } from '../models/Company';
import { Case } from '../models/Case';
import { Invoice } from '../models/Invoice';
import { Notification } from '../models/Notification';
import { AppDataSource } from '../config/database';
import { Redis } from '../config/redis';

const router = Router();
const caseService = new CaseService();
const redis = Redis.getInstance();

// GET /api/dashboard/stats
router.get('/stats',
  authenticate,
  async (req: any, res, next) => {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const cacheKey = `dashboard:stats:${req.user.userId}:${startDate || ''}:${endDate || ''}:${groupBy || ''}`;
      
      // Check cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
      
      // Build filter
      const filter: any = {};
      if (req.user.companyId) {
        filter.companyId = req.user.companyId;
      }
      if (startDate && endDate) {
        filter.dateFrom = new Date(startDate as string);
        filter.dateTo = new Date(endDate as string);
      }
      
      // Get case statistics
      const caseStats = await caseService.getCaseStatistics(filter);
      
      // Get financial statistics
      const invoiceRepository = AppDataSource.getRepository(Invoice);
      const invoiceQuery = invoiceRepository.createQueryBuilder('invoice');
      
      if (req.user.companyId) {
        invoiceQuery.where('invoice.companyId = :companyId', { 
          companyId: req.user.companyId 
        });
      }
      
      if (startDate && endDate) {
        invoiceQuery.andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        });
      }
      
      const invoices = await invoiceQuery.getMany();
      
      const monthlyRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.total), 0);
      
      const pendingPayments = invoices
        .filter(inv => ['unpaid', 'overdue', 'partially_paid'].includes(inv.status))
        .reduce((sum, inv) => sum + Number(inv.getOutstandingAmount()), 0);
      
      // Get recent activity
      const recentCases = await caseService.getCases(
        { ...filter },
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' }
      );
      
      const recentActivity = recentCases.data.map(c => ({
        id: c.id,
        type: 'case_created',
        description: `案件 ${c.caseNumber} が作成されました`,
        timestamp: c.createdAt,
      }));
      
      const response: any = {
        totalCases: caseStats.total,
        activeCases: (caseStats.totalByStatus?.assigned || 0) + 
                     (caseStats.totalByStatus?.contact_pending || 0) +
                     (caseStats.totalByStatus?.hearing_scheduled || 0),
        completedCases: caseStats.totalByStatus?.contracted || 0,
        conversionRate: caseStats.conversionRate,
        monthlyRevenue,
        pendingPayments,
        recentActivity,
      };
      
      // Add grouping if requested
      if (groupBy === 'company') {
        const companyRepository = AppDataSource.getRepository(Company);
        const companies = await companyRepository.find({
          relations: ['assignedCases'],
        });
        
        response['byCompany'] = companies.map(company => ({
          companyId: company.id,
          companyName: company.name,
          totalCases: company.assignedCases.length,
          conversionRate: company.performanceMetrics?.conversionRate || 0,
        }));
      }
      
      if (groupBy === 'salesAccount') {
        // Similar logic for sales accounts
        response['bySalesAccount'] = [];
      }
      
      // Add period if date range specified
      if (startDate && endDate) {
        response['period'] = {
          startDate: startDate as string,
          endDate: endDate as string,
        };
      }
      
      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(response));
      res.setHeader('X-Cache', 'MISS');
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/dashboard/charts/cases
router.get('/charts/cases',
  authenticate,
  async (req: any, res, next) => {
    try {
      const { period = '30d' } = req.query;
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      
      // Get cases grouped by date
      const caseRepository = AppDataSource.getRepository(Case);
      const cases = await caseRepository
        .createQueryBuilder('case')
        .where('case.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .andWhere(req.user.companyId ? 'case.assignedCompanyId = :companyId' : '1=1', {
          companyId: req.user.companyId,
        })
        .select("DATE(case.createdAt)", "date")
        .addSelect("COUNT(*)", "count")
        .addSelect("case.status", "status")
        .groupBy("DATE(case.createdAt)")
        .addGroupBy("case.status")
        .getRawMany();
      
      res.json({
        period,
        startDate,
        endDate,
        data: cases,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/dashboard/charts/revenue
router.get('/charts/revenue',
  authenticate,
  async (req: any, res, next) => {
    try {
      const { period = '30d' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      
      // Get revenue data
      const invoiceRepository = AppDataSource.getRepository(Invoice);
      const revenue = await invoiceRepository
        .createQueryBuilder('invoice')
        .where('invoice.paidAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .andWhere(req.user.companyId ? 'invoice.companyId = :companyId' : '1=1', {
          companyId: req.user.companyId,
        })
        .select("DATE(invoice.paidAt)", "date")
        .addSelect("SUM(invoice.paidAmount)", "amount")
        .groupBy("DATE(invoice.paidAt)")
        .getRawMany();
      
      res.json({
        period,
        startDate,
        endDate,
        data: revenue,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/dashboard/notifications
router.get('/notifications',
  authenticate,
  async (req: any, res, next) => {
    try {
      const notificationRepository = AppDataSource.getRepository(Notification);
      
      const notifications = await notificationRepository.find({
        where: {
          recipient: req.user.email,
          status: 'pending',
        },
        order: {
          createdAt: 'DESC',
        },
        take: 10,
      });
      
      res.json({
        count: notifications.length,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;