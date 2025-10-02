import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('GET /api/dashboard/stats', () => {
  let app: Express;
  let authToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    authToken = 'Bearer valid.jwt.token';
  });

  it('should return dashboard statistics', async () => {
    const response = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalCases');
    expect(response.body).toHaveProperty('activeCases');
    expect(response.body).toHaveProperty('completedCases');
    expect(response.body).toHaveProperty('conversionRate');
    expect(response.body).toHaveProperty('monthlyRevenue');
    expect(response.body).toHaveProperty('pendingPayments');
    expect(response.body).toHaveProperty('recentActivity');
    
    // Validate data types
    expect(typeof response.body.totalCases).toBe('number');
    expect(typeof response.body.activeCases).toBe('number');
    expect(typeof response.body.completedCases).toBe('number');
    expect(typeof response.body.conversionRate).toBe('number');
    expect(typeof response.body.monthlyRevenue).toBe('number');
    expect(typeof response.body.pendingPayments).toBe('number');
    expect(Array.isArray(response.body.recentActivity)).toBe(true);
  });

  it('should return statistics with date range filter', async () => {
    const response = await request(app)
      .get('/api/dashboard/stats')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('period');
    expect(response.body.period).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });
  });

  it('should return statistics by company for admin', async () => {
    const response = await request(app)
      .get('/api/dashboard/stats')
      .query({
        groupBy: 'company',
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('byCompany');
    expect(Array.isArray(response.body.byCompany)).toBe(true);
    
    if (response.body.byCompany.length > 0) {
      const companyStats = response.body.byCompany[0];
      expect(companyStats).toHaveProperty('companyId');
      expect(companyStats).toHaveProperty('companyName');
      expect(companyStats).toHaveProperty('totalCases');
      expect(companyStats).toHaveProperty('conversionRate');
    }
  });

  it('should return statistics by sales account', async () => {
    const response = await request(app)
      .get('/api/dashboard/stats')
      .query({
        groupBy: 'salesAccount',
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('bySalesAccount');
    expect(Array.isArray(response.body.bySalesAccount)).toBe(true);
  });

  it('should fail without authentication', async () => {
    const response = await request(app)
      .get('/api/dashboard/stats');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('No authorization token provided');
  });

  it('should fail with invalid date range', async () => {
    const response = await request(app)
      .get('/api/dashboard/stats')
      .query({
        startDate: '2024-01-31',
        endDate: '2024-01-01', // End before start
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid date range');
  });

  it('should cache results for performance', async () => {
    const start = Date.now();
    
    // First request
    await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', authToken);
    
    const firstDuration = Date.now() - start;
    
    // Second request (should be cached)
    const secondStart = Date.now();
    const response = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', authToken);
    
    const secondDuration = Date.now() - secondStart;
    
    expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty('x-cache');
    expect(response.headers['x-cache']).toBe('HIT');
    expect(secondDuration).toBeLessThan(firstDuration / 2);
  });
});