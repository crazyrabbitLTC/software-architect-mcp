import { describe, it, expect } from 'vitest';
import { logger } from '../src/utils/logger.js';

describe('Project Setup', () => {
  it('should have logger configured', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
  });

  it('should load environment variables', () => {
    // Basic environment check
    expect(process.env).toBeDefined();
  });

  it('should have correct TypeScript configuration', async () => {
    // This test verifies that imports work correctly
    const { MCPServer } = await import('../src/core/server.js');
    expect(MCPServer).toBeDefined();
  });
}); 