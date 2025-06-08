import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPServer } from '../../src/core/server.js';
import type { ReviewPlanParams, ReviewImplementationParams } from '../../src/types/index.js';

describe('MCPServer', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer('test-server', '1.0.0');
  });

  describe('Initialization', () => {
    it('should create a server with correct name and version', () => {
      expect(server).toBeDefined();
      expect(server.getName()).toBe('test-server');
      expect(server.getVersion()).toBe('1.0.0');
    });

    it('should initialize with default capabilities', () => {
      const capabilities = server.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.tools).toBeDefined();
    });
  });

  describe('Tool Registration', () => {
    it('should register review_plan tool with correct schema', () => {
      server.registerTools();
      const tools = server.getRegisteredTools();
      
      const reviewPlanTool = tools.find(tool => tool.name === 'review_plan');
      expect(reviewPlanTool).toBeDefined();
      expect(reviewPlanTool?.description).toBe('Reviews implementation plan before coding');
      expect(reviewPlanTool?.inputSchema).toBeDefined();
    });

    it('should register review_implementation tool with correct schema', () => {
      server.registerTools();
      const tools = server.getRegisteredTools();
      
      const reviewImplTool = tools.find(tool => tool.name === 'review_implementation');
      expect(reviewImplTool).toBeDefined();
      expect(reviewImplTool?.description).toBe('Reviews completed implementation');
      expect(reviewImplTool?.inputSchema).toBeDefined();
    });

    it('should validate review_plan tool schema matches ReviewPlanParams', () => {
      server.registerTools();
      const tools = server.getRegisteredTools();
      const reviewPlanTool = tools.find(tool => tool.name === 'review_plan');
      
      const schema = reviewPlanTool?.inputSchema;
      expect(schema?.type).toBe('object');
      expect(schema?.properties).toBeDefined();
      expect(schema?.properties?.taskId).toBeDefined();
      expect(schema?.properties?.taskDescription).toBeDefined();
      expect(schema?.properties?.implementationPlan).toBeDefined();
      expect(schema?.required).toContain('taskId');
      expect(schema?.required).toContain('taskDescription');
      expect(schema?.required).toContain('implementationPlan');
    });

    it('should validate review_implementation tool schema matches ReviewImplementationParams', () => {
      server.registerTools();
      const tools = server.getRegisteredTools();
      const reviewImplTool = tools.find(tool => tool.name === 'review_implementation');
      
      const schema = reviewImplTool?.inputSchema;
      expect(schema?.type).toBe('object');
      expect(schema?.properties).toBeDefined();
      expect(schema?.properties?.taskId).toBeDefined();
      expect(schema?.properties?.completionSummary).toBeDefined();
      expect(schema?.required).toContain('taskId');
      expect(schema?.required).toContain('completionSummary');
    });
  });

  describe('Request Handling', () => {
    it('should handle list tools request', async () => {
      server.registerTools();
      const response = await server.handleListTools();
      
      expect(response).toBeDefined();
      expect(response.tools).toBeDefined();
      expect(response.tools.length).toBe(2);
      expect(response.tools.some(tool => tool.name === 'review_plan')).toBe(true);
      expect(response.tools.some(tool => tool.name === 'review_implementation')).toBe(true);
    });

    it('should handle call tool request for review_plan', async () => {
      server.registerTools();
      
      const mockParams: ReviewPlanParams = {
        taskId: 'test-123',
        taskDescription: 'Test task',
        implementationPlan: 'Test plan',
        codebaseRoot: '/test/path'
      };

      const response = await server.handleCallTool('review_plan', mockParams);
      
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should handle call tool request for review_implementation', async () => {
      server.registerTools();
      
      const mockParams: ReviewImplementationParams = {
        taskId: 'test-123',
        completionSummary: 'Test completion',
        changedFiles: ['file1.ts', 'file2.ts']
      };

      const response = await server.handleCallTool('review_implementation', mockParams);
      
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should throw error for unknown tool', async () => {
      server.registerTools();
      
      const mockParams: ReviewPlanParams = {
        taskId: 'test-123',
        taskDescription: 'Test task',
        implementationPlan: 'Test plan'
      };

      await expect(server.handleCallTool('unknown_tool', mockParams))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid parameters gracefully', async () => {
      server.registerTools();
      
      const invalidParams: ReviewPlanParams = {
        taskId: '', // Invalid empty taskId
        taskDescription: 'Test',
        implementationPlan: 'Test'
      };

      await expect(server.handleCallTool('review_plan', invalidParams))
        .rejects.toThrow();
    });

    it('should log errors appropriately', async () => {
      // Import logger for spy
      const { logger } = await import('../../src/utils/logger.js');
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
      
      server.logError('Test error');
      
      expect(loggerSpy).toHaveBeenCalledWith('Test error');
      loggerSpy.mockRestore();
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully', async () => {
      await expect(server.start()).resolves.not.toThrow();
      expect(server.isRunning()).toBe(true);
    });

    it('should stop server successfully', async () => {
      await server.start();
      await expect(server.stop()).resolves.not.toThrow();
      expect(server.isRunning()).toBe(false);
    });

    it('should handle multiple start/stop cycles', async () => {
      await server.start();
      await server.stop();
      await server.start();
      await server.stop();
      
      expect(server.isRunning()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should load configuration on initialization', () => {
      const config = server.getConfig();
      expect(config).toBeDefined();
    });

    it('should use environment variables when available', () => {
      const originalEnv = process.env.MCP_SERVER_NAME;
      process.env.MCP_SERVER_NAME = 'env-test-server';
      
      const envServer = new MCPServer();
      expect(envServer.getName()).toBe('env-test-server');
      
      // Restore original env
      if (originalEnv) {
        process.env.MCP_SERVER_NAME = originalEnv;
      } else {
        delete process.env.MCP_SERVER_NAME;
      }
    });
  });
}); 