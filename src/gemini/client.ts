/**
 * Google Gemini API Client
 * Handles interactions with Gemini for code reviews
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import type { ReviewPlanParams, ReviewImplementationParams, CodeReviewParams, ReviewResponse, GeminiConfig } from '../types/index.js';

export class GeminiClient {
  private client: GoogleGenerativeAI;
  private proModel: GenerativeModel;
  private flashModel: GenerativeModel;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.proModel = this.client.getGenerativeModel({ model: config.proModel });
    this.flashModel = this.client.getGenerativeModel({ model: config.flashModel });
    
    logger.info('Gemini client initialized');
  }

  async reviewPlan(params: ReviewPlanParams): Promise<ReviewResponse> {
    logger.info(`Reviewing plan for task: ${params.taskId}`);
    
    const prompt = this.buildPlanReviewPrompt(params);
    
    try {
      // Use Pro model for plan reviews (more complex reasoning)
      const result = await this.proModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });

      const response = result.response;
      const text = response.text();
      
      return this.parseReviewResponse(text, 'plan', params.taskId);
    } catch (error) {
      logger.error('Error calling Gemini API for plan review:', error);
      throw error;
    }
  }

  async reviewImplementation(params: ReviewImplementationParams): Promise<ReviewResponse> {
    logger.info(`Reviewing implementation for task: ${params.taskId}`);
    
    const prompt = this.buildImplementationReviewPrompt(params);
    
    try {
      // Use Flash model for implementation reviews (faster, pattern matching)
      const result = await this.flashModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });

      const response = result.response;
      const text = response.text();
      
      return this.parseReviewResponse(text, 'implementation', params.taskId);
    } catch (error) {
      logger.error('Error calling Gemini API for implementation review:', error);
      throw error;
    }
  }

  async codeReview(params: CodeReviewParams): Promise<ReviewResponse> {
    logger.info('Performing general code review');
    
    const prompt = this.buildCodeReviewPrompt(params);
    
    try {
      // Use Pro model for code reviews (better for comprehensive analysis)
      const result = await this.proModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });

      const response = result.response;
      const text = response.text();
      
      return this.parseReviewResponse(text, 'plan', 'code-review-' + Date.now());
    } catch (error) {
      logger.error('Error calling Gemini API for code review:', error);
      throw error;
    }
  }

  private buildPlanReviewPrompt(params: ReviewPlanParams): string {
    return `You are a senior software architect reviewing an implementation plan. Analyze the following plan and provide structured feedback.

Task ID: ${params.taskId}
Task Description: ${params.taskDescription}

Implementation Plan:
${params.implementationPlan}

Codebase Context:
${params.codebaseContext}

Please provide a JSON response with the following structure:
{
  "approved": boolean,
  "feedback": {
    "summary": "Brief overall assessment",
    "issues": ["List of critical issues or concerns"],
    "suggestions": ["List of recommendations"],
    "strengths": ["List of positive aspects"]
  },
  "metadata": {
    "confidence": 0.0-1.0
  }
}

Consider:
1. Architectural soundness
2. Security implications
3. Performance considerations
4. Maintainability
5. Alignment with task requirements
6. Best practices adherence`;
  }

  private buildImplementationReviewPrompt(params: ReviewImplementationParams): string {
    return `You are a senior software architect reviewing a completed implementation. Compare the implementation against the original plan and provide structured feedback.

Task ID: ${params.taskId}
Task Description: ${params.taskDescription}

Original Plan:
${params.originalPlan}

Implementation Summary:
${params.implementationSummary}

Current Codebase State:
${params.codebaseSnapshot}

Please provide a JSON response with the following structure:
{
  "approved": boolean,
  "feedback": {
    "summary": "Brief overall assessment",
    "issues": ["List of deviations or problems"],
    "suggestions": ["List of improvements"],
    "strengths": ["List of well-implemented aspects"]
  },
  "metadata": {
    "confidence": 0.0-1.0
  }
}

Consider:
1. Adherence to the original plan
2. Code quality and best practices
3. Test coverage
4. Documentation completeness
5. Security and performance
6. Any technical debt introduced`;
  }

  private buildCodeReviewPrompt(params: CodeReviewParams): string {
    const focusSection = params.reviewFocus 
      ? `\n\nSpecial Focus: ${params.reviewFocus}\nPay particular attention to this area in your review.`
      : '';

    return `You are a senior software engineer conducting a comprehensive code review. Analyze the provided codebase and provide structured feedback.

Codebase to Review:
${params.codebaseContext}${focusSection}

Please provide a JSON response with the following structure:
{
  "approved": boolean,
  "feedback": {
    "summary": "Brief overall assessment of the codebase",
    "issues": ["List of problems, bugs, or concerns found"],
    "suggestions": ["List of recommendations for improvement"],
    "strengths": ["List of positive aspects and good practices"]
  },
  "metadata": {
    "confidence": 0.0-1.0
  }
}

Focus your review on:
1. Code quality and maintainability
2. Security vulnerabilities and best practices
3. Performance implications
4. Architecture and design patterns
5. Error handling and edge cases
6. Documentation and code clarity
7. Testing coverage and test quality
8. Dependencies and third-party usage
9. Consistency with coding standards
10. Potential refactoring opportunities`;
  }

  private parseReviewResponse(responseText: string, reviewType: 'plan' | 'implementation', taskId: string): ReviewResponse {
    try {
      const parsed = JSON.parse(responseText);
      
      return {
        approved: parsed.approved || false,
        reviewType,
        feedback: {
          summary: parsed.feedback?.summary || 'No summary provided',
          issues: parsed.feedback?.issues || [],
          suggestions: parsed.feedback?.suggestions || [],
          strengths: parsed.feedback?.strengths || []
        },
        metadata: {
          taskId,
          reviewedAt: new Date().toISOString(),
          modelUsed: reviewType === 'plan' ? this.config.proModel : this.config.flashModel,
          confidence: parsed.metadata?.confidence || 0.5
        }
      };
    } catch (error) {
      logger.error('Error parsing Gemini response:', error);
      logger.error('Raw response:', responseText);
      
      // Return a default response on parse error
      return {
        approved: false,
        reviewType,
        feedback: {
          summary: 'Error parsing review response',
          issues: ['Failed to parse AI response'],
          suggestions: ['Please retry the review'],
          strengths: []
        },
        metadata: {
          taskId,
          reviewedAt: new Date().toISOString(),
          modelUsed: reviewType === 'plan' ? this.config.proModel : this.config.flashModel,
          confidence: 0
        }
      };
    }
  }
} 