export interface ReviewImplementationParams {
  taskId: string;
  taskDescription: string;
  implementationPlan: string;
  completionSummary: string;
  beforeCodebase: string;
  afterCodebase: string;
}

export interface ReviewPlanParams {
  taskId: string;
  taskDescription: string;
  implementationPlan: string;
  codebaseContext: string;
}

export interface StoredTask {
  id: string;
  status: 'pending' | 'in-progress' | 'review' | 'done' | 'failed';
}

export interface GeminiConfig {
  apiKey?: string;
  proModel: string;
  flashModel: string;
}

export interface ServerConfig {
  port: number;
  logLevel: string;
  gemini: GeminiConfig;
} 