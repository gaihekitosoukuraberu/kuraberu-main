import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('GET /api/sales/accounts', () => {
  let app: Express;
  let authToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    authToken = 'Bearer valid.jwt.token';
  });

  it('should return list of sales accounts', async () => {
    const response = await request(app)
      .get('/api/sales/accounts')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    if (response.body.data.length > 0) {
      const account = response.body.data[0];
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('accountCode');
      expect(account).toHaveProperty('companyName');
      expect(account).toHaveProperty('contactPerson');
      expect(account).toHaveProperty('email');
      expect(account).toHaveProperty('phoneNumber');
      expect(account).toHaveProperty('areas');
      expect(account).toHaveProperty('isActive');
      expect(account).toHaveProperty('performanceMetrics');
      expect(Array.isArray(account.areas)).toBe(true);
    }
  });

  it('should filter accounts by area', async () => {
    const response = await request(app)
      .get('/api/sales/accounts')
      .query({ area: '東京都' })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((account: any) => {
      expect(account.areas).toContain('東京都');
    });
  });

  it('should filter active accounts only', async () => {
    const response = await request(app)
      .get('/api/sales/accounts')
      .query({ isActive: true })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((account: any) => {
      expect(account.isActive).toBe(true);
    });
  });

  it('should include performance metrics', async () => {
    const response = await request(app)
      .get('/api/sales/accounts')
      .query({ includeMetrics: true })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    
    if (response.body.data.length > 0) {
      const metrics = response.body.data[0].performanceMetrics;
      expect(metrics).toHaveProperty('totalCases');
      expect(metrics).toHaveProperty('conversionRate');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('customerSatisfaction');
      expect(metrics).toHaveProperty('monthlyRevenue');
    }
  });

  it('should sort by performance metrics', async () => {
    const response = await request(app)
      .get('/api/sales/accounts')
      .query({ 
        sortBy: 'conversionRate',
        sortOrder: 'desc',
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    
    for (let i = 1; i < response.body.data.length; i++) {
      const prevRate = response.body.data[i - 1].performanceMetrics.conversionRate;
      const currRate = response.body.data[i].performanceMetrics.conversionRate;
      expect(prevRate).toBeGreaterThanOrEqual(currRate);
    }
  });

  it('should search by company name', async () => {
    const response = await request(app)
      .get('/api/sales/accounts')
      .query({ search: 'ホーム' })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((account: any) => {
      expect(account.companyName).toMatch(/ホーム/);
    });
  });

  it('should return account availability for case assignment', async () => {
    const response = await request(app)
      .get('/api/sales/accounts')
      .query({ 
        checkAvailability: true,
        area: '東京都',
        propertyType: 'house',
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((account: any) => {
      expect(account).toHaveProperty('availability');
      expect(account.availability).toHaveProperty('canAcceptNewCases');
      expect(account.availability).toHaveProperty('currentLoad');
      expect(account.availability).toHaveProperty('maxCapacity');
    });
  });

  it('should fail without authentication', async () => {
    const response = await request(app)
      .get('/api/sales/accounts');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});