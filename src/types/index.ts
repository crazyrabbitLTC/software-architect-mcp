/**
 * TypeScript interfaces and types for the Software Architect MCP Server
 */

// Tool parameter schemas - External API (what MCP tools receive)
export interface ReviewPlanParams {
  taskId: string;
  taskDescription: string;
  implementationPlan: string;
  codebasePath: string; // Path to codebase, not processed content
}

export interface ReviewImplementationParams {
  taskId: string;
  taskDescription: string;
  originalPlan: string;
  implementationSummary: string;
  beforePath: string; // Path to codebase before changes
  afterPath: string; // Path to codebase after changes
}

// Internal parameter schemas - what gets sent to Gemini
export interface GeminiReviewPlanParams {
  taskId: string;
  taskDescription: string;
  implementationPlan: string;
  codebaseContext: string; // Processed/flattened content
}

export interface GeminiReviewImplementationParams {
  taskId: string;
  taskDescription: string;
  originalPlan: string;
  implementationSummary: string;
  codebaseSnapshot: string; // Processed diff content
}

export interface CodeReviewParams {
  codebaseContext: string;
  reviewFocus?: string;
}

export interface SecurityReviewParams {
  codebaseContext: string;
  securityFocus?: string;
}

export interface BestPracticesReviewParams {
  codebaseContext: string;
  practicesFocus?: string;
  language?: string;
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
  preReviewSnapshotId?: string;
  postReviewSnapshotId?: string;
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