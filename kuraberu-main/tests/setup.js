/**
 * Jest setup file
 * 
 * This file runs before each test file is executed.
 */

// Mock browser functions that aren't available in jsdom
window.scrollTo = jest.fn();
window.scrollIntoView = jest.fn();

// Silence console errors and warnings during tests
global.console = {
  ...console,
  // Uncomment to disable specific console methods during tests
  // error: jest.fn(),
  // warn: jest.fn(),
  log: jest.fn(),
};

// Setup DOM testing utilities
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});