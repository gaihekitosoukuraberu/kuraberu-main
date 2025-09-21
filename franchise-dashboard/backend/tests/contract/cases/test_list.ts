import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('GET /api/cases', () => {
  let app: Express;
  let authToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    authToken = 'Bearer valid.jwt.token';
  });

  it('should return paginated list of cases', async () => {
    const response = await request(app)
      .get('/api/cases')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Pagination metadata
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('limit');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('totalPages');
    
    // Case structure
    if (response.body.data.length > 0) {
      const testCase = response.body.data[0];
      expect(testCase).toHaveProperty('id');
      expect(testCase).toHaveProperty('caseNumber');
      expect(testCase).toHaveProperty('customerName');
      expect(testCase).toHaveProperty('phoneNumber');
      expect(testCase).toHaveProperty('address');
      expect(testCase).toHaveProperty('propertyType');
      expect(testCase).toHaveProperty('status');
      expect(testCase).toHaveProperty('assignedCompany');
      expect(testCase).toHaveProperty('salesAccount');
      expect(testCase).toHaveProperty('createdAt');
      expect(testCase).toHaveProperty('updatedAt');
    }
  });

  it('should filter cases by status', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({ status: 'pending_assignment' })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((testCase: any) => {
      expect(testCase.status).toBe('pending_assignment');
    });
  });

  it('should filter cases by multiple statuses', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({ status: ['pending_assignment', 'assigned'] })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((testCase: any) => {
      expect(['pending_assignment', 'assigned']).toContain(testCase.status);
    });
  });

  it('should filter cases by company', async () => {
    const companyId = 'company-123';
    const response = await request(app)
      .get('/api/cases')
      .query({ companyId })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((testCase: any) => {
      expect(testCase.assignedCompany?.id).toBe(companyId);
    });
  });

  it('should filter cases by sales account', async () => {
    const salesAccountId = 'sales-456';
    const response = await request(app)
      .get('/api/cases')
      .query({ salesAccountId })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((testCase: any) => {
      expect(testCase.salesAccount?.id).toBe(salesAccountId);
    });
  });

  it('should search cases by customer name', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({ search: '田中' })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((testCase: any) => {
      expect(testCase.customerName).toMatch(/田中/);
    });
  });

  it('should search cases by phone number', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({ search: '090-1234' })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((testCase: any) => {
      expect(testCase.phoneNumber).toMatch(/090-1234/);
    });
  });

  it('should sort cases by created date descending', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({ 
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    
    for (let i = 1; i < response.body.data.length; i++) {
      const prevDate = new Date(response.body.data[i - 1].createdAt);
      const currDate = new Date(response.body.data[i].createdAt);
      expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
    }
  });

  it('should handle pagination parameters', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({
        page: 2,
        limit: 10,
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(10);
    expect(response.body.data.length).toBeLessThanOrEqual(10);
  });

  it('should return empty array for out of range page', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({
        page: 9999,
        limit: 10,
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.page).toBe(9999);
  });

  it('should fail without authentication', async () => {
    const response = await request(app)
      .get('/api/cases');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should validate pagination parameters', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({
        page: -1,
        limit: 0,
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid pagination');
  });

  it('should include case statistics in response', async () => {
    const response = await request(app)
      .get('/api/cases')
      .query({ includeStats: true })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('stats');
    expect(response.body.stats).toHaveProperty('totalByStatus');
    expect(response.body.stats.totalByStatus).toHaveProperty('pending_assignment');
    expect(response.body.stats.totalByStatus).toHaveProperty('assigned');
    expect(response.body.stats.totalByStatus).toHaveProperty('contracted');
  });
});