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
        const startTime = Date.now();
        logger.info('Handling review_plan request', { 
          taskId: params.taskId,
          codebasePath: params.codebasePath 
        });
        
        try {
          // Validate inputs
          if (!params.taskId.trim()) {
            throw new Error('VALIDATION_ERROR: taskId cannot be empty');
          }
          if (!params.taskDescription.trim()) {
            throw new Error('VALIDATION_ERROR: taskDescription cannot be empty');
          }
          if (!params.implementationPlan.trim()) {
            throw new Error('VALIDATION_ERROR: implementationPlan cannot be empty');
          }

          // Flatten the codebase for context
          logger.debug('Flattening codebase', { codebasePath: params.codebasePath });
          const flattenedCode = await this.flattener.flattenCodebase(params.codebasePath);
          if (!flattenedCode) {
            throw new Error('CODEBASE_ERROR: Failed to flatten codebase - check if path exists and is accessible');
          }

          logger.debug('Sending request to Gemini', { taskId: params.taskId });
          const response = await this.gemini.reviewPlan({
            taskId: params.taskId,
            taskDescription: params.taskDescription,
            implementationPlan: params.implementationPlan,
            codebaseContext: flattenedCode
          });

          // Store the review in task context
          logger.debug('Storing task context', { taskId: params.taskId });
          await this.storage.storeTaskContext(params.taskId, {
            taskId: params.taskId,
            taskDescription: params.taskDescription,
            plan: params.implementationPlan,
            reviews: [response],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          const duration = Date.now() - startTime;
          logger.info('Successfully completed review_plan', { 
            taskId: params.taskId, 
            durationMs: duration 
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = errorMessage.includes(':') ? errorMessage.split(':')[0] : 'UNKNOWN_ERROR';
          
          logger.error('Error in review_plan', {
            taskId: params.taskId,
            errorCode,
            errorMessage,
            durationMs: duration,
            codebasePath: params.codebasePath
          });

          // Throw structured error with more context
          const structuredError = new Error(`REVIEW_PLAN_FAILED: ${errorMessage}`);
          structuredError.name = errorCode;
          throw structuredError;
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
        const startTime = Date.now();
        logger.info('Handling review_implementation request', { 
          taskId: params.taskId,
          beforePath: params.beforePath,
          afterPath: params.afterPath
        });
        
        try {
          // Validate inputs
          if (!params.taskId.trim()) {
            throw new Error('VALIDATION_ERROR: taskId cannot be empty');
          }
          if (!params.taskDescription.trim()) {
            throw new Error('VALIDATION_ERROR: taskDescription cannot be empty');
          }
          if (!params.originalPlan.trim()) {
            throw new Error('VALIDATION_ERROR: originalPlan cannot be empty');
          }
          if (!params.implementationSummary.trim()) {
            throw new Error('VALIDATION_ERROR: implementationSummary cannot be empty');
          }

          // Get or create task context
          logger.debug('Retrieving task context', { taskId: params.taskId });
          let taskContext = await this.storage.retrieveTaskContext(params.taskId);
          if (!taskContext) {
            logger.debug('Creating new task context', { taskId: params.taskId });
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
          logger.debug('Generating diff', { beforePath: params.beforePath, afterPath: params.afterPath });
          const diff = await this.flattener.getDiff(params.beforePath, params.afterPath);
          if (!diff) {
            throw new Error('DIFF_ERROR: Failed to generate diff - check if both paths exist and are accessible');
          }

          // Review the implementation
          logger.debug('Sending implementation review to Gemini', { taskId: params.taskId });
          const response = await this.gemini.reviewImplementation({
            taskId: params.taskId,
            taskDescription: params.taskDescription,
            originalPlan: params.originalPlan,
            implementationSummary: params.implementationSummary,
            codebaseSnapshot: diff
          });

          // Update task context with implementation review
          logger.debug('Updating task context', { taskId: params.taskId });
          taskContext.implementation = params.implementationSummary;
          taskContext.reviews.push(response);
          taskContext.updatedAt = new Date().toISOString();
          await this.storage.storeTaskContext(params.taskId, taskContext);
          
          const duration = Date.now() - startTime;
          logger.info('Successfully completed review_implementation', { 
            taskId: params.taskId, 
            durationMs: duration 
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = errorMessage.includes(':') ? errorMessage.split(':')[0] : 'UNKNOWN_ERROR';
          
          logger.error('Error in review_implementation', {
            taskId: params.taskId,
            errorCode,
            errorMessage,
            durationMs: duration,
            beforePath: params.beforePath,
            afterPath: params.afterPath
          });

          // Throw structured error with more context
          const structuredError = new Error(`REVIEW_IMPLEMENTATION_FAILED: ${errorMessage}`);
          structuredError.name = errorCode;
          throw structuredError;
        }
      }
    );

    // Define code_review tool
    this.server.tool(
      'code_review',
      {
        codebasePath: z.string().describe('Path to the codebase to review'),
        reviewFocus: z.string().optional().describe('Specific area to focus the review on (e.g., security, performance, architecture)')
      },
      async (params) => {
        const startTime = Date.now();
        logger.info('Handling code_review request', { 
          codebasePath: params.codebasePath,
          reviewFocus: params.reviewFocus 
        });
        
        try {
          // Validate inputs
          if (!params.codebasePath.trim()) {
            throw new Error('VALIDATION_ERROR: codebasePath cannot be empty');
          }

          // Flatten the codebase for context
          logger.debug('Flattening codebase for review', { codebasePath: params.codebasePath });
          const flattenedCode = await this.flattener.flattenCodebase(params.codebasePath);
          if (!flattenedCode) {
            throw new Error('CODEBASE_ERROR: Failed to flatten codebase - check if path exists and is accessible');
          }

          logger.debug('Sending code review request to Gemini', { reviewFocus: params.reviewFocus });
          const response = await this.gemini.codeReview({
            codebaseContext: flattenedCode,
            reviewFocus: params.reviewFocus
          });
          
          const duration = Date.now() - startTime;
          logger.info('Successfully completed code_review', { 
            codebasePath: params.codebasePath,
            durationMs: duration 
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = errorMessage.includes(':') ? errorMessage.split(':')[0] : 'UNKNOWN_ERROR';
          
          logger.error('Error in code_review', {
            codebasePath: params.codebasePath,
            reviewFocus: params.reviewFocus,
            errorCode,
            errorMessage,
            durationMs: duration
          });

          // Throw structured error with more context
          const structuredError = new Error(`CODE_REVIEW_FAILED: ${errorMessage}`);
          structuredError.name = errorCode;
          throw structuredError;
        }
      }
    );

    // Define security_review tool
    this.server.tool(
      'security_review',
      {
        codebasePath: z.string().describe('Path to the codebase to review for security vulnerabilities'),
        securityFocus: z.string().optional().describe('Specific security area to focus on (e.g., authentication, input validation, cryptography)')
      },
      async (params) => {
        const startTime = Date.now();
        logger.info('Handling security_review request', { 
          codebasePath: params.codebasePath,
          securityFocus: params.securityFocus 
        });
        
        try {
          // Validate inputs
          if (!params.codebasePath.trim()) {
            throw new Error('VALIDATION_ERROR: codebasePath cannot be empty');
          }

          // Flatten the codebase for context
          logger.debug('Flattening codebase for security review', { codebasePath: params.codebasePath });
          const flattenedCode = await this.flattener.flattenCodebase(params.codebasePath);
          if (!flattenedCode) {
            throw new Error('CODEBASE_ERROR: Failed to flatten codebase - check if path exists and is accessible');
          }

          logger.debug('Sending security review request to Gemini', { securityFocus: params.securityFocus });
          const response = await this.gemini.securityReview({
            codebaseContext: flattenedCode,
            securityFocus: params.securityFocus
          });
          
          const duration = Date.now() - startTime;
          logger.info('Successfully completed security_review', { 
            codebasePath: params.codebasePath,
            durationMs: duration 
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = errorMessage.includes(':') ? errorMessage.split(':')[0] : 'UNKNOWN_ERROR';
          
          logger.error('Error in security_review', {
            codebasePath: params.codebasePath,
            securityFocus: params.securityFocus,
            errorCode,
            errorMessage,
            durationMs: duration
          });

          // Throw structured error with more context
          const structuredError = new Error(`SECURITY_REVIEW_FAILED: ${errorMessage}`);
          structuredError.name = errorCode;
          throw structuredError;
        }
      }
    );

    // Define best_practices_review tool
    this.server.tool(
      'best_practices_review',
      {
        codebasePath: z.string().describe('Path to the codebase to review for best practices'),
        practicesFocus: z.string().optional().describe('Specific practices area to focus on (e.g., naming, testing, documentation, performance)'),
        language: z.string().optional().describe('Primary programming language for language-specific best practices')
      },
      async (params) => {
        const startTime = Date.now();
        logger.info('Handling best_practices_review request', { 
          codebasePath: params.codebasePath,
          practicesFocus: params.practicesFocus,
          language: params.language 
        });
        
        try {
          // Validate inputs
          if (!params.codebasePath.trim()) {
            throw new Error('VALIDATION_ERROR: codebasePath cannot be empty');
          }

          // Flatten the codebase for context
          logger.debug('Flattening codebase for best practices review', { codebasePath: params.codebasePath });
          const flattenedCode = await this.flattener.flattenCodebase(params.codebasePath);
          if (!flattenedCode) {
            throw new Error('CODEBASE_ERROR: Failed to flatten codebase - check if path exists and is accessible');
          }

          logger.debug('Sending best practices review request to Gemini', { 
            practicesFocus: params.practicesFocus,
            language: params.language 
          });
          const response = await this.gemini.bestPracticesReview({
            codebaseContext: flattenedCode,
            practicesFocus: params.practicesFocus,
            language: params.language
          });
          
          const duration = Date.now() - startTime;
          logger.info('Successfully completed best_practices_review', { 
            codebasePath: params.codebasePath,
            durationMs: duration 
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = errorMessage.includes(':') ? errorMessage.split(':')[0] : 'UNKNOWN_ERROR';
          
          logger.error('Error in best_practices_review', {
            codebasePath: params.codebasePath,
            practicesFocus: params.practicesFocus,
            language: params.language,
            errorCode,
            errorMessage,
            durationMs: duration
          });

          // Throw structured error with more context
          const structuredError = new Error(`BEST_PRACTICES_REVIEW_FAILED: ${errorMessage}`);
          structuredError.name = errorCode;
          throw structuredError;
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