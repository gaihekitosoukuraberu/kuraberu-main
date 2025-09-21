import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('POST /api/auth/login', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Routes will be added during implementation
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@franchise.com',
        password: 'Admin123!',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user).toHaveProperty('email');
    expect(response.body.user).toHaveProperty('role');
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('should fail with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@franchise.com',
        password: 'Admin123!',
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should fail with invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@franchise.com',
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should fail with missing email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'Admin123!',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('email');
  });

  it('should fail with missing password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@franchise.com',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('password');
  });

  it('should fail with invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'notanemail',
        password: 'Admin123!',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('email');
  });

  it('should handle rate limiting after 5 failed attempts', async () => {
    // Make 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@franchise.com',
          password: 'wrongpassword',
        });
    }

    // 6th attempt should be rate limited
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@franchise.com',
        password: 'Admin123!',
      });

    expect(response.status).toBe(429);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Too many attempts');
  });
});