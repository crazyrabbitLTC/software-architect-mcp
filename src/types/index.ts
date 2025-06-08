/**
 * TypeScript interfaces and types for the Software Architect MCP Server
 */

// Tool parameter schemas
export interface ReviewPlanParams {
  taskId: string;
  taskDescription: string;
  implementationPlan: string;
  codebaseContext: string;
}

export interface ReviewImplementationParams {
  taskId: string;
  taskDescription: string;
  originalPlan: string;
  implementationSummary: string;
  codebaseSnapshot: string;
}

export interface CodeReviewParams {
  codebaseContext: string;
  reviewFocus?: string;
}

// Review response types
export interface ReviewFeedback {
  summary: string;
  strengths: string[];
  concerns: string[];
  suggestions: string[];
  risks?: string[];
}

export interface ReviewMetadata {
  codebaseSize: number;
  reviewTimestamp: string;
  modelUsed: string;
  processingTimeMs?: number;
}

export interface ReviewResponse {
  approved: boolean;
  reviewType: 'plan' | 'implementation';
  feedback: {
    summary: string;
    issues: string[];
    suggestions: string[];
    strengths: string[];
  };
  metadata: {
    taskId: string;
    reviewedAt: string;
    modelUsed: string;
    confidence: number;
  };
}

// Storage types
export interface StoredTask {
  taskId: string;
  plan?: string;
  preSnapshot?: string;
  postSnapshot?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Configuration types
export interface GeminiConfig {
  apiKey: string;
  proModel: string;
  flashModel: string;
}

export interface ServerConfig {
  name: string;
  version: string;
  gemini: GeminiConfig;
}

export interface StorageConfig {
  basePath: string;
  encrypt?: boolean;
  maxSizeMB?: number;
}

// Task context for storage
export interface TaskContext {
  taskId: string;
  taskDescription: string;
  plan?: string;
  implementation?: string;
  preSnapshot?: string;
  postSnapshot?: string;
  reviews: ReviewResponse[];
  createdAt: string;
  updatedAt: string;
}

// Repomix configuration
export interface RepomixConfig {
  style?: 'plain' | 'markdown' | 'html';
  excludePatterns?: string[];
  includePatterns?: string[];
  maxFileSize?: number;
} 