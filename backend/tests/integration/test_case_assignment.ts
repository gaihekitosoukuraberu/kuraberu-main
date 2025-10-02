import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('Integration: Case Assignment Flow', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@franchise.com',
        password: 'Admin123!',
      });
    
    authToken = `Bearer ${loginResponse.body.accessToken}`;
  });

  it('should complete full case assignment workflow', async () => {
    // Step 1: Create a new case
    const createResponse = await request(app)
      .post('/api/cases')
      .set('Authorization', authToken)
      .send({
        customerName: '山田花子',
        phoneNumber: '090-9876-5432',
        email: 'yamada@example.com',
        address: '東京都新宿区西新宿1-1-1',
        propertyType: 'house',
        propertyArea: 120,
        budget: '200万円〜300万円',
        urgency: 'high',
        notes: '築15年、外壁にひび割れあり',
      });

    expect(createResponse.status).toBe(201);
    const caseId = createResponse.body.id;
    expect(createResponse.body.status).toBe('pending_assignment');

    // Step 2: Get available sales accounts for the area
    const accountsResponse = await request(app)
      .get('/api/sales/accounts')
      .query({
        area: '東京都',
        propertyType: 'house',
        checkAvailability: true,
      })
      .set('Authorization', authToken);

    expect(accountsResponse.status).toBe(200);
    expect(accountsResponse.body.data.length).toBeGreaterThan(0);
    
    const selectedAccount = accountsResponse.body.data[0];
    expect(selectedAccount.availability.canAcceptNewCases).toBe(true);

    // Step 3: Assign case to sales account
    const assignResponse = await request(app)
      .post(`/api/cases/${caseId}/assign`)
      .set('Authorization', authToken)
      .send({
        salesAccountId: selectedAccount.id,
        companyId: selectedAccount.companyId,
        assignmentNote: '優先対応エリアのため即時割当',
      });

    expect(assignResponse.status).toBe(200);
    expect(assignResponse.body.salesAccount.id).toBe(selectedAccount.id);
    expect(assignResponse.body.status).toBe('assigned');

    // Step 4: Verify notification was sent
    const notificationsResponse = await request(app)
      .get(`/api/cases/${caseId}/notifications`)
      .set('Authorization', authToken);

    expect(notificationsResponse.status).toBe(200);
    expect(notificationsResponse.body.data).toContainEqual(
      expect.objectContaining({
        type: 'case_assigned',
        recipient: selectedAccount.email,
        status: 'sent',
      })
    );

    // Step 5: Update case status to contact_pending
    const statusUpdateResponse = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'contact_pending',
        comment: '担当者へ連絡依頼済み',
      });

    expect(statusUpdateResponse.status).toBe(200);
    expect(statusUpdateResponse.body.status).toBe('contact_pending');

    // Step 6: Add contact log
    const contactLogResponse = await request(app)
      .post(`/api/cases/${caseId}/contact-log`)
      .set('Authorization', authToken)
      .send({
        contactType: 'phone',
        contactedAt: new Date().toISOString(),
        notes: '初回電話連絡完了。明日14時にヒアリング予定',
        nextAction: 'hearing_scheduled',
      });

    expect(contactLogResponse.status).toBe(201);

    // Step 7: Schedule hearing
    const hearingResponse = await request(app)
      .post(`/api/cases/${caseId}/hearing`)
      .set('Authorization', authToken)
      .send({
        scheduledAt: '2024-02-01T14:00:00Z',
        estimatedDuration: 60,
        location: 'オンライン（Zoom）',
        attendees: ['山田花子', '営業担当者'],
      });

    expect(hearingResponse.status).toBe(201);

    // Step 8: Update status to hearing_scheduled
    const hearingStatusResponse = await request(app)
      .put(`/api/cases/${caseId}/status`)
      .set('Authorization', authToken)
      .send({
        status: 'hearing_scheduled',
        comment: 'ヒアリング日程確定：2/1 14:00',
      });

    expect(hearingStatusResponse.status).toBe(200);
    expect(hearingStatusResponse.body.status).toBe('hearing_scheduled');

    // Step 9: Verify case timeline
    const timelineResponse = await request(app)
      .get(`/api/cases/${caseId}/timeline`)
      .set('Authorization', authToken);

    expect(timelineResponse.status).toBe(200);
    expect(timelineResponse.body.events).toHaveLength(7); // All actions above
    expect(timelineResponse.body.events[0].type).toBe('case_created');
    expect(timelineResponse.body.events[timelineResponse.body.events.length - 1].type).toBe('status_changed');
  });

  it('should handle automatic assignment based on rules', async () => {
    // Create case in specific area with auto-assignment rules
    const createResponse = await request(app)
      .post('/api/cases')
      .set('Authorization', authToken)
      .send({
        customerName: '佐藤一郎',
        phoneNumber: '080-1111-2222',
        address: '大阪府大阪市北区',
        propertyType: 'apartment',
        urgency: 'normal',
        autoAssign: true,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.status).toBe('assigned');
    expect(createResponse.body.salesAccount).toBeDefined();
    expect(createResponse.body.assignmentMethod).toBe('automatic');
  });

  it('should handle reassignment when sales account is unavailable', async () => {
    // Create and assign case
    const createResponse = await request(app)
      .post('/api/cases')
      .set('Authorization', authToken)
      .send({
        customerName: '鈴木次郎',
        phoneNumber: '070-3333-4444',
        address: '神奈川県横浜市',
        propertyType: 'house',
      });

    const caseId = createResponse.body.id;

    // Assign to first account
    const firstAssignResponse = await request(app)
      .post(`/api/cases/${caseId}/assign`)
      .set('Authorization', authToken)
      .send({
        salesAccountId: 'account-1',
        companyId: 'company-1',
      });

    expect(firstAssignResponse.status).toBe(200);

    // Request reassignment due to unavailability
    const reassignResponse = await request(app)
      .post(`/api/cases/${caseId}/reassign`)
      .set('Authorization', authToken)
      .send({
        reason: 'sales_account_unavailable',
        notes: '担当者が急病のため再割当が必要',
      });

    expect(reassignResponse.status).toBe(200);
    expect(reassignResponse.body.salesAccount.id).not.toBe('account-1');
    expect(reassignResponse.body.reassignmentHistory).toHaveLength(1);
  });

  it('should track assignment performance metrics', async () => {
    // Get assignment metrics for a period
    const metricsResponse = await request(app)
      .get('/api/analytics/assignment-metrics')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
      .set('Authorization', authToken);

    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.body).toHaveProperty('averageAssignmentTime');
    expect(metricsResponse.body).toHaveProperty('reassignmentRate');
    expect(metricsResponse.body).toHaveProperty('autoAssignmentRate');
    expect(metricsResponse.body).toHaveProperty('byAccount');
    
    if (metricsResponse.body.byAccount.length > 0) {
      const accountMetrics = metricsResponse.body.byAccount[0];
      expect(accountMetrics).toHaveProperty('accountId');
      expect(accountMetrics).toHaveProperty('totalAssigned');
      expect(accountMetrics).toHaveProperty('conversionRate');
      expect(accountMetrics).toHaveProperty('averageResponseTime');
    }
  });
});