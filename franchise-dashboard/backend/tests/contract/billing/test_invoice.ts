import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('GET /api/billing/invoice', () => {
  let app: Express;
  let authToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    authToken = 'Bearer valid.jwt.token';
  });

  it('should return list of invoices', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    if (response.body.data.length > 0) {
      const invoice = response.body.data[0];
      expect(invoice).toHaveProperty('id');
      expect(invoice).toHaveProperty('invoiceNumber');
      expect(invoice).toHaveProperty('companyId');
      expect(invoice).toHaveProperty('billingMonth');
      expect(invoice).toHaveProperty('items');
      expect(invoice).toHaveProperty('subtotal');
      expect(invoice).toHaveProperty('tax');
      expect(invoice).toHaveProperty('total');
      expect(invoice).toHaveProperty('status');
      expect(invoice).toHaveProperty('dueDate');
      expect(invoice).toHaveProperty('issuedAt');
      expect(Array.isArray(invoice.items)).toBe(true);
    }
  });

  it('should filter invoices by billing month', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .query({ billingMonth: '2024-01' })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((invoice: any) => {
      expect(invoice.billingMonth).toBe('2024-01');
    });
  });

  it('should filter invoices by company', async () => {
    const companyId = 'company-123';
    const response = await request(app)
      .get('/api/billing/invoice')
      .query({ companyId })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((invoice: any) => {
      expect(invoice.companyId).toBe(companyId);
    });
  });

  it('should filter invoices by payment status', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .query({ status: 'unpaid' })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    response.body.data.forEach((invoice: any) => {
      expect(invoice.status).toBe('unpaid');
    });
  });

  it('should return overdue invoices', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .query({ overdue: true })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    
    const today = new Date();
    response.body.data.forEach((invoice: any) => {
      const dueDate = new Date(invoice.dueDate);
      expect(dueDate.getTime()).toBeLessThan(today.getTime());
      expect(invoice.status).not.toBe('paid');
    });
  });

  it('should calculate invoice totals correctly', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    
    if (response.body.data.length > 0) {
      const invoice = response.body.data[0];
      
      // Verify totals calculation
      const itemsTotal = invoice.items.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
      
      expect(invoice.subtotal).toBe(itemsTotal);
      expect(invoice.tax).toBe(Math.floor(itemsTotal * 0.1)); // 10% tax
      expect(invoice.total).toBe(invoice.subtotal + invoice.tax);
    }
  });

  it('should include payment history', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .query({ includePayments: true })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    
    if (response.body.data.length > 0) {
      const invoice = response.body.data[0];
      expect(invoice).toHaveProperty('payments');
      expect(Array.isArray(invoice.payments)).toBe(true);
      
      if (invoice.payments.length > 0) {
        const payment = invoice.payments[0];
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('amount');
        expect(payment).toHaveProperty('paymentDate');
        expect(payment).toHaveProperty('method');
      }
    }
  });

  it('should return summary statistics', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .query({ includeSummary: true })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('summary');
    expect(response.body.summary).toHaveProperty('totalAmount');
    expect(response.body.summary).toHaveProperty('paidAmount');
    expect(response.body.summary).toHaveProperty('unpaidAmount');
    expect(response.body.summary).toHaveProperty('overdueAmount');
    expect(response.body.summary).toHaveProperty('invoiceCount');
  });

  it('should export invoices as CSV', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .query({ 
        format: 'csv',
        billingMonth: '2024-01',
      })
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('invoices');
  });

  it('should generate invoice PDF', async () => {
    const invoiceId = 'invoice-123';
    const response = await request(app)
      .get(`/api/billing/invoice/${invoiceId}/pdf`)
      .set('Authorization', authToken);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('inline');
  });

  it('should handle invalid billing month format', async () => {
    const response = await request(app)
      .get('/api/billing/invoice')
      .query({ billingMonth: 'invalid-month' })
      .set('Authorization', authToken);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid billing month format');
  });

  it('should fail without authentication', async () => {
    const response = await request(app)
      .get('/api/billing/invoice');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});