/**
 * Review Engine
 * Orchestrates the review process
 */

import { logger } from '../utils/logger.js';
import { CodeFlattener } from '../repomix/flattener.js';
import { StorageManager } from '../storage/manager.js';
import { GeminiClient } from '../gemini/client.js';
import type { 
  ReviewResponse, 
  ReviewPlanParams, 
  ReviewImplementationParams,
  TaskContext
} from '../types/index.js';

export class ReviewEngine {
  constructor(
    private flattener: CodeFlattener,
    private storage: StorageManager,
    private geminiClient: GeminiClient
  ) {
    logger.info('Review engine initialized');
  }

  /**
   * Orchestrates the plan review process
   */
  async reviewPlan(params: ReviewPlanParams): Promise<ReviewResponse> {
    try {
      logger.info(`Starting plan review for task: ${params.taskId}`);
      
      // 1. Flatten codebase using repomix
      const codebaseContext = await this.flattener.flattenCodebase(params.codebasePath);
      if (!codebaseContext) {
        throw new Error('Failed to flatten codebase for review');
      }

      // 2. Store pre-review snapshot
      const snapshotId = await this.storage.storeSnapshot(params.taskId, codebaseContext, 'pre');
      logger.info(`Stored pre-review snapshot: ${snapshotId}`);

      // 3. Send to Gemini for review
      const reviewParams = {
        ...params,
        codebaseContext
      };
      
      const geminiResponse = await this.geminiClient.reviewPlan(reviewParams);

      // 4. Store task context with plan and review
      const taskContext: TaskContext = {
        taskId: params.taskId,
        taskDescription: params.taskDescription,
        plan: params.implementationPlan,
        reviews: [geminiResponse],
        preReviewSnapshotId: snapshotId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.storage.storeTaskContext(params.taskId, taskContext);

      // 5. Format and return response
      return this.formatReviewResponse(geminiResponse, 'plan', params.taskId);

    } catch (error) {
      logger.error(`Error in plan review for task ${params.taskId}:`, error);
      throw new Error(`Plan review failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Orchestrates the implementation review process
   */
  async reviewImplementation(params: ReviewImplementationParams): Promise<ReviewResponse> {
    try {
      logger.info(`Starting implementation review for task: ${params.taskId}`);

      // 1. Get or create task context
      let taskContext = await this.storage.retrieveTaskContext(params.taskId);
      if (!taskContext) {
        // Create minimal context if not found
        taskContext = {
          taskId: params.taskId,
          taskDescription: params.taskDescription,
          plan: params.originalPlan,
          reviews: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // 2. Generate diff between before and after states
      const codebaseDiff = await this.flattener.getDiff(params.beforePath, params.afterPath);
      if (!codebaseDiff) {
        throw new Error('Failed to generate codebase diff');
      }

      // 3. Store post-implementation snapshot
      const afterSnapshot = await this.flattener.flattenCodebase(params.afterPath);
      if (!afterSnapshot) {
        throw new Error('Failed to capture post-implementation snapshot');
      }
      
      const snapshotId = await this.storage.storeSnapshot(params.taskId, afterSnapshot, 'post');
      logger.info(`Stored post-implementation snapshot: ${snapshotId}`);

      // 4. Send to Gemini for implementation review
      const reviewParams = {
        ...params,
        codebaseSnapshot: codebaseDiff
      };
      
      const geminiResponse = await this.geminiClient.reviewImplementation(reviewParams);

      // 5. Update task context with implementation details
      taskContext.implementation = params.implementationSummary;
      taskContext.postReviewSnapshotId = snapshotId;
      taskContext.reviews.push(geminiResponse);
      taskContext.updatedAt = new Date().toISOString();

      await this.storage.storeTaskContext(params.taskId, taskContext);

      // 6. Format and return response
      return this.formatReviewResponse(geminiResponse, 'implementation', params.taskId);

    } catch (error) {
      logger.error(`Error in implementation review for task ${params.taskId}:`, error);
      throw new Error(`Implementation review failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Compares two task contexts or snapshots
   */
  async compareTaskContexts(taskId1: string, taskId2: string): Promise<string> {
    try {
      const context1 = await this.storage.retrieveTaskContext(taskId1);
      const context2 = await this.storage.retrieveTaskContext(taskId2);

      if (!context1 || !context2) {
        throw new Error('One or both task contexts not found');
      }

      // Simple comparison - could be enhanced with more sophisticated diffing
      return JSON.stringify({
        taskId1: context1.taskId,
        taskId2: context2.taskId,
        planDifferences: this.comparePlans(context1.plan, context2.plan),
        reviewCount1: context1.reviews.length,
        reviewCount2: context2.reviews.length,
        timeDifference: new Date(context2.createdAt).getTime() - new Date(context1.createdAt).getTime()
      }, null, 2);

    } catch (error) {
      logger.error(`Error comparing task contexts ${taskId1} and ${taskId2}:`, error);
      throw error;
    }
  }

  /**
   * Formats Gemini response into standardized ReviewResponse
   */
  private formatReviewResponse(geminiResponse: any, reviewType: 'plan' | 'implementation', taskId: string): ReviewResponse {
    // Gemini should return structured JSON, but handle potential variations
    const response = typeof geminiResponse === 'string' ? JSON.parse(geminiResponse) : geminiResponse;

    return {
      approved: response.approved || false,
      reviewType,
      feedback: {
        summary: response.feedback?.summary || 'No summary provided',
        issues: response.feedback?.issues || [],
        suggestions: response.feedback?.suggestions || [],
        strengths: response.feedback?.strengths || []
      },
      metadata: {
        taskId,
        reviewedAt: new Date().toISOString(),
        modelUsed: response.metadata?.modelUsed || 'gemini-1.5-pro',
        confidence: response.metadata?.confidence || 0.8
      }
    };
  }

  /**
   * Simple text comparison utility
   */
  private comparePlans(plan1?: string, plan2?: string): string {
    if (!plan1 || !plan2) {
      return 'One or both plans are missing';
    }

    if (plan1 === plan2) {
      return 'Plans are identical';
    }

    // Simple length-based comparison - could be enhanced
    const lengthDiff = Math.abs(plan1.length - plan2.length);
    if (lengthDiff > plan1.length * 0.5) {
      return 'Plans are significantly different';
    } else if (lengthDiff > plan1.length * 0.2) {
      return 'Plans have moderate differences';
    } else {
      return 'Plans have minor differences';
    }
  }
} 