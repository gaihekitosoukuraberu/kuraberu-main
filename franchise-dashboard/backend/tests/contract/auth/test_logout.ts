import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('POST /api/auth/logout', () => {
  let app: Express;
  let validToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Mock valid token for testing
    validToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  });

  it('should logout with valid token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', validToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Logged out successfully');
  });

  it('should fail without authorization header', async () => {
    const response = await request(app)
      .post('/api/auth/logout');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('No authorization token provided');
  });

  it('should fail with invalid token format', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'InvalidTokenFormat');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid token format');
  });

  it('should fail with expired token', async () => {
    const expiredToken = 'Bearer expired.token.here';
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', expiredToken);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Token expired');
  });

  it('should invalidate refresh token on logout', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', validToken)
      .send({
        refreshToken: 'valid-refresh-token',
      });

    expect(response.status).toBe(200);
    
    // Try to use the same refresh token again
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'valid-refresh-token',
      });

    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.error).toBe('Invalid refresh token');
  });
});