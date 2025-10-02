import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('PUT /api/cases/{id}/status', () => {
  let app: Express;
  let authToken: string;
  const caseId = 'case-123';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    authToken = 'Bearer valid.jwt.token';
  });

  it('should update case status', async () => {
    const response = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'assigned',
        comment: 'Assigned to Company A',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', caseId);
    expect(response.body).toHaveProperty('status', 'assigned');
    expect(response.body).toHaveProperty('statusHistory');
    expect(Array.isArray(response.body.statusHistory)).toBe(true);
    
    const latestHistory = response.body.statusHistory[0];
    expect(latestHistory).toHaveProperty('previousStatus');
    expect(latestHistory).toHaveProperty('newStatus', 'assigned');
    expect(latestHistory).toHaveProperty('comment', 'Assigned to Company A');
    expect(latestHistory).toHaveProperty('changedBy');
    expect(latestHistory).toHaveProperty('changedAt');
  });

  it('should validate status transition rules', async () => {
    // Cannot go from contracted back to pending
    const response = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'pending_assignment',
        previousStatus: 'contracted',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid status transition');
  });

  it('should require comment for certain transitions', async () => {
    const response = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'contracted',
        // Missing required comment for contract status
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Comment required');
  });

  it('should notify relevant parties on status change', async () => {
    const response = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'hearing_scheduled',
        comment: 'Hearing scheduled for 2024-02-01 14:00',
        notifyCustomer: true,
        notifyCompany: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('notifications');
    expect(response.body.notifications).toHaveProperty('customer', true);
    expect(response.body.notifications).toHaveProperty('company', true);
  });

  it('should handle case not found', async () => {
    const response = await request(app)
      .put('/api/cases/non-existent/status')
      .set('Authorization', authToken)
      .send({
        status: 'assigned',
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Case not found');
  });

  it('should validate status enum values', async () => {
    const response = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'invalid_status',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid status');
  });

  it('should check permissions for status update', async () => {
    const operatorToken = 'Bearer operator.jwt.token';
    
    // Operator cannot change to contracted
    const response = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', operatorToken)
      .send({
        status: 'contracted',
        comment: 'Contract signed',
      });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Insufficient permissions');
  });

  it('should track status duration metrics', async () => {
    const response = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'hearing_complete',
        comment: 'Hearing completed successfully',
        includeMetrics: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metrics');
    expect(response.body.metrics).toHaveProperty('timeInPreviousStatus');
    expect(response.body.metrics).toHaveProperty('averageTimeForStatus');
  });

  it('should handle concurrent status updates', async () => {
    // Simulate concurrent updates with version control
    const response1 = request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'assigned',
        version: 1,
      });

    const response2 = request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'contact_pending',
        version: 1,
      });

    const [res1, res2] = await Promise.all([response1, response2]);
    
    // One should succeed, one should fail with version conflict
    const responses = [res1, res2];
    const success = responses.find(r => r.status === 200);
    const conflict = responses.find(r => r.status === 409);
    
    expect(success).toBeDefined();
    expect(conflict).toBeDefined();
    expect(conflict?.body.error).toContain('Version conflict');
  });
});