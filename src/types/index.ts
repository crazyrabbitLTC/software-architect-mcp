/**
 * TypeScript interfaces and types for the Software Architect MCP Server
 */

// Tool parameter schemas
export interface ReviewPlanParams {
  taskId: string;
  taskDescription: string;
  implementationPlan: string;
  codebaseRoot?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface ReviewImplementationParams {
  taskId: string;
  completionSummary: string;
  changedFiles?: string[];
  codebaseRoot?: string;
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
  taskId: string;
  reviewType: 'plan' | 'implementation';
  overallScore: number;
  feedback: ReviewFeedback;
  metadata: ReviewMetadata;
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
export interface ServerConfig {
  geminiApiKey: string;
  geminiModel: string;
  storageBasePath: string;
  maxCodebaseSizeMB: number;
  repomixTimeoutMs: number;
  geminiRequestTimeoutMs: number;
  enableAuditLog: boolean;
  encryptTempFiles: boolean;
} 