import { beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

beforeAll(() => {
  // Global test setup
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Global test cleanup
});