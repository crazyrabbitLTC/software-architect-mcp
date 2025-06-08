import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiClient } from '../../src/gemini/client.js';
import type { GeminiConfig, ReviewPlanParams, ReviewImplementationParams } from '../../src/types/index.js';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockImplementation(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            approved: true,
            feedback: {
              summary: 'Good implementation plan',
              issues: [],
              suggestions: ['Consider adding error handling'],
              strengths: ['Clear structure', 'Good separation of concerns']
            },
            metadata: {
              confidence: 0.8
            }
          })
        }
      })
    }))
  }))
}));

describe('GeminiClient', () => {
  let client: GeminiClient;
  const testConfig: GeminiConfig = {
    apiKey: 'test-api-key',
    proModel: 'gemini-1.5-pro',
    flashModel: 'gemini-1.5-flash'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GeminiClient(testConfig);
  });

  describe('initialization', () => {
    it('should create client with valid config', () => {
      expect(client).toBeDefined();
    });

    it('should throw error if API key is missing', () => {
      expect(() => new GeminiClient({ ...testConfig, apiKey: '' })).toThrow('Gemini API key is required');
    });
  });

  describe('reviewPlan', () => {
    it('should review a plan and return structured response', async () => {
      const params: ReviewPlanParams = {
        taskId: 'test-123',
        taskDescription: 'Implement user authentication',
        implementationPlan: 'Use JWT tokens with refresh token rotation',
        codebaseContext: 'Express.js API with PostgreSQL'
      };

      const response = await client.reviewPlan(params);

      expect(response).toBeDefined();
      expect(response.approved).toBe(true);
      expect(response.reviewType).toBe('plan');
      expect(response.feedback.summary).toBe('Good implementation plan');
      expect(response.metadata.taskId).toBe('test-123');
      expect(response.metadata.confidence).toBe(0.8);
    });

    it('should include model used in metadata', async () => {
      const params: ReviewPlanParams = {
        taskId: 'test-123',
        taskDescription: 'Test task',
        implementationPlan: 'Test plan',
        codebaseContext: 'Test context'
      };

      const response = await client.reviewPlan(params);
      expect(response.metadata.modelUsed).toBe('gemini-1.5-pro');
    });
  });

  describe('reviewImplementation', () => {
    it('should review implementation and return structured response', async () => {
      const params: ReviewImplementationParams = {
        taskId: 'test-456',
        taskDescription: 'Implement user authentication',
        originalPlan: 'Use JWT tokens with refresh token rotation',
        implementationSummary: 'Implemented JWT auth with Redis session store',
        codebaseSnapshot: 'Current code state with auth implementation'
      };

      const response = await client.reviewImplementation(params);

      expect(response).toBeDefined();
      expect(response.approved).toBe(true);
      expect(response.reviewType).toBe('implementation');
      expect(response.feedback.summary).toBe('Good implementation plan');
      expect(response.metadata.taskId).toBe('test-456');
    });

    it('should use flash model for implementation reviews', async () => {
      const params: ReviewImplementationParams = {
        taskId: 'test-456',
        taskDescription: 'Test task',
        originalPlan: 'Test plan',
        implementationSummary: 'Test summary',
        codebaseSnapshot: 'Test snapshot'
      };

      const response = await client.reviewImplementation(params);
      expect(response.metadata.modelUsed).toBe('gemini-1.5-flash');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const mockGenerateContent = vi.fn().mockRejectedValue(new Error('API Error'));
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockImplementation(() => ({
          generateContent: mockGenerateContent
        }))
      }) as any);

      const errorClient = new GeminiClient(testConfig);
      const params: ReviewPlanParams = {
        taskId: 'test-error',
        taskDescription: 'Test task',
        implementationPlan: 'Test plan',
        codebaseContext: 'Test context'
      };

      await expect(errorClient.reviewPlan(params)).rejects.toThrow('API Error');
    });

    it('should handle invalid JSON response', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockImplementation(() => ({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => 'Invalid JSON'
            }
          })
        }))
      }) as any);

      const errorClient = new GeminiClient(testConfig);
      const params: ReviewPlanParams = {
        taskId: 'test-parse-error',
        taskDescription: 'Test task',
        implementationPlan: 'Test plan',
        codebaseContext: 'Test context'
      };

      const response = await errorClient.reviewPlan(params);
      
      expect(response.approved).toBe(false);
      expect(response.feedback.summary).toBe('Error parsing review response');
      expect(response.feedback.issues).toContain('Failed to parse AI response');
      expect(response.metadata.confidence).toBe(0);
    });
  });
}); 