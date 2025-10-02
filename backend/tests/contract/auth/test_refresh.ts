import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('POST /api/auth/refresh', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
  });

  it('should refresh tokens with valid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'valid-refresh-token-here',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.accessToken).toMatch(/^eyJ/); // JWT format
    expect(response.body.refreshToken).toBeTruthy();
  });

  it('should fail with missing refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('refreshToken');
  });

  it('should fail with invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'invalid-refresh-token',
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid refresh token');
  });

  it('should fail with expired refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'expired-refresh-token',
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Refresh token expired');
  });

  it('should fail with revoked refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'revoked-refresh-token',
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Refresh token has been revoked');
  });

  it('should return different tokens on each refresh', async () => {
    const firstResponse = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'valid-refresh-token-1',
      });

    const secondResponse = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: firstResponse.body.refreshToken,
      });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstResponse.body.accessToken).not.toBe(secondResponse.body.accessToken);
    expect(firstResponse.body.refreshToken).not.toBe(secondResponse.body.refreshToken);
  });
});