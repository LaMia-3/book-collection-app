// Import testing-library extensions
require('@testing-library/jest-dom');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  
  return {
    getItem: jest.fn((key) => {
      return store[key] || null;
    }),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((i) => {
      return Object.keys(store)[i] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

// Set up localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Import and setup fake-indexeddb
require('fake-indexeddb/auto');
const { IDBFactory } = require('fake-indexeddb');

// Ensure console.log doesn't cause test noise
global.console = {
  ...console,
  // Keep native behavior for other methods, use mock for specified methods
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Reset mocks between tests
beforeEach(() => {
  localStorageMock.clear();
  indexedDB = new IDBFactory();
  jest.clearAllMocks();
});
