/**
 * Gemini API Client
 * Handles communication with Google Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

export class GeminiClient {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    logger.info(`Gemini client initialized with model: ${modelName}`);
  }

  // TODO: Implement review request methods
  // TODO: Implement prompt templates
  // TODO: Implement error handling and retries
} 