/**
 * Core MCP Server implementation
 * Handles tool registration and request processing
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { StorageManager } from '../storage/manager.js';
import { GeminiClient } from '../gemini/client.js';
import { CodeFlattener } from '../repomix/flattener.js';
import type { ServerConfig, TaskContext } from '../types/index.js';

export class MCPServer {
  private server: McpServer;
  private storage: StorageManager;
  private gemini: GeminiClient;
  private flattener: CodeFlattener;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new McpServer({
      name: config.name,
      version: config.version,
      capabilities: {
        tools: {}
      }
    });
    
    // Initialize storage with default config
    this.storage = new StorageManager({
      basePath: '/tmp/software-architect-mcp',
      encrypt: false,
      maxSizeMB: 100
    });
    
    // Initialize Gemini client
    this.gemini = new GeminiClient(config.gemini);

    // Initialize code flattener
    this.flattener = new CodeFlattener();
    
    this.setupTools();
  }

  private setupTools() {
    // Define review_plan tool
    this.server.tool(
      'review_plan',
      {
        taskId: z.string().describe('Unique identifier for the task'),
        taskDescription: z.string().describe('Description of the task to be implemented'),
        implementationPlan: z.string().describe('Detailed plan for implementing the task'),
        codebasePath: z.string().describe('Path to the codebase to analyze')
      },
      async (params) => {
        logger.info('Handling review_plan request', { taskId: params.taskId });
        
        try {
          // Flatten the codebase for context
          const flattenedCode = await this.flattener.flattenCodebase(params.codebasePath);
          if (!flattenedCode) {
            throw new Error('Failed to flatten codebase');
          }

          const response = await this.gemini.reviewPlan({
            taskId: params.taskId,
            taskDescription: params.taskDescription,
            implementationPlan: params.implementationPlan,
            codebaseContext: flattenedCode
          });

          // Store the review in task context
          await this.storage.storeTaskContext(params.taskId, {
            taskId: params.taskId,
            taskDescription: params.taskDescription,
            plan: params.implementationPlan,
            reviews: [response],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          logger.error('Error in review_plan', error);
          throw error;
        }
      }
    );

    // Define review_implementation tool
    this.server.tool(
      'review_implementation',
      {
        taskId: z.string().describe('Unique identifier for the task'),
        taskDescription: z.string().describe('Description of the task that was implemented'),
        originalPlan: z.string().describe('Original implementation plan'),
        implementationSummary: z.string().describe('Summary of what was actually implemented'),
        beforePath: z.string().describe('Path to codebase before changes'),
        afterPath: z.string().describe('Path to codebase after changes')
      },
      async (params) => {
        logger.info('Handling review_implementation request', { taskId: params.taskId });
        
        try {
          // Get or create task context
          let taskContext = await this.storage.retrieveTaskContext(params.taskId);
          if (!taskContext) {
            taskContext = {
              taskId: params.taskId,
              taskDescription: params.taskDescription,
              plan: params.originalPlan,
              reviews: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }

          // Get diff between before and after states
          const diff = await this.flattener.getDiff(params.beforePath, params.afterPath);
          if (!diff) {
            throw new Error('Failed to generate diff');
          }

          // Review the implementation
          const response = await this.gemini.reviewImplementation({
            taskId: params.taskId,
            taskDescription: params.taskDescription,
            originalPlan: params.originalPlan,
            implementationSummary: params.implementationSummary,
            codebaseSnapshot: diff
          });

          // Update task context with implementation review
          taskContext.implementation = params.implementationSummary;
          taskContext.reviews.push(response);
          taskContext.updatedAt = new Date().toISOString();
          await this.storage.storeTaskContext(params.taskId, taskContext);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          logger.error('Error in review_implementation', error);
          throw error;
        }
      }
    );
  }

  async start(transport: StdioServerTransport) {
    logger.info('Starting MCP server');
    await this.storage.initialize();
    await this.server.connect(transport);
    logger.info('MCP server connected');
  }

  getServer(): McpServer {
    return this.server;
  }
} 