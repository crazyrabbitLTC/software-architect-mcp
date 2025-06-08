/**
 * Google Gemini API Client
 * Handles interactions with Gemini for code reviews
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import type { 
  GeminiConfig, 
  GeminiReviewPlanParams,
  GeminiReviewImplementationParams,
  CodeReviewParams,
  SecurityReviewParams,
  BestPracticesReviewParams,
  ReviewResponse 
} from '../types/index.js';

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

  async reviewPlan(params: GeminiReviewPlanParams): Promise<ReviewResponse> {
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

  async reviewImplementation(params: GeminiReviewImplementationParams): Promise<ReviewResponse> {
    logger.info(`Reviewing implementation for task: ${params.taskId}`);
    
    const prompt = this.buildImplementationReviewPrompt(params);
    
    try {
      // Use Flash model for implementation reviews (faster, still capable)
      const result = await this.flashModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
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

  async securityReview(params: SecurityReviewParams): Promise<ReviewResponse> {
    logger.info('Performing security review');
    
    const prompt = this.buildSecurityReviewPrompt(params);
    
    try {
      // Use Pro model for security reviews (better for thorough security analysis)
      const result = await this.proModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });

      const response = result.response;
      const text = response.text();
      
      return this.parseReviewResponse(text, 'plan', 'security-review-' + Date.now());
    } catch (error) {
      logger.error('Error calling Gemini API for security review:', error);
      throw error;
    }
  }

  async bestPracticesReview(params: BestPracticesReviewParams): Promise<ReviewResponse> {
    logger.info('Performing best practices review');
    
    const prompt = this.buildBestPracticesReviewPrompt(params);
    
    try {
      // Use Pro model for best practices reviews (better for comprehensive analysis)
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
      
      return this.parseReviewResponse(text, 'plan', 'best-practices-review-' + Date.now());
    } catch (error) {
      logger.error('Error calling Gemini API for best practices review:', error);
      throw error;
    }
  }

  private buildPlanReviewPrompt(params: GeminiReviewPlanParams): string {
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

  private buildImplementationReviewPrompt(params: GeminiReviewImplementationParams): string {
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

  private buildSecurityReviewPrompt(params: SecurityReviewParams): string {
    const focusSection = params.securityFocus 
      ? `\n\nSpecial Security Focus: ${params.securityFocus}\nPay particular attention to this security area in your review.`
      : '';

    return `You are a senior cybersecurity engineer and penetration tester conducting a comprehensive security audit. Your role is to identify security vulnerabilities, potential attack vectors, and recommend security improvements.

Codebase to Security Review:
${params.codebaseContext}${focusSection}

Please provide a JSON response with the following structure:
{
  "approved": boolean,
  "feedback": {
    "summary": "Brief overall security assessment",
    "issues": ["List of security vulnerabilities and weaknesses found"],
    "suggestions": ["List of security improvements and mitigations"],
    "strengths": ["List of good security practices already implemented"]
  },
  "metadata": {
    "confidence": 0.0-1.0
  }
}

Focus your security review on these critical areas:

1. **Authentication & Authorization**:
   - Weak or missing authentication mechanisms
   - Insecure session management
   - Authorization bypass vulnerabilities
   - Default or weak credentials
   - JWT/token security issues

2. **Input Validation & Injection Attacks**:
   - SQL injection vulnerabilities
   - Cross-site scripting (XSS) risks
   - Command injection possibilities
   - LDAP injection vulnerabilities
   - XML/JSON injection attacks
   - Path traversal vulnerabilities

3. **Data Security & Privacy**:
   - Sensitive data exposure
   - Inadequate encryption (at rest and in transit)
   - Weak cryptographic implementations
   - Personal data handling violations
   - Data leakage through logs or errors

4. **Network Security**:
   - Insecure communication protocols
   - Missing HTTPS/TLS enforcement
   - Weak SSL/TLS configuration
   - CORS misconfigurations
   - Open ports and services

5. **Code Security Practices**:
   - Hardcoded secrets and credentials
   - Insecure random number generation
   - Race conditions and concurrency issues
   - Memory safety issues
   - Insecure deserialization

6. **Infrastructure Security**:
   - Container security issues
   - Insecure file permissions
   - Environment configuration vulnerabilities
   - Dependency vulnerabilities
   - Supply chain security risks

7. **Error Handling & Information Disclosure**:
   - Verbose error messages revealing sensitive info
   - Stack traces in production
   - Debug information exposure
   - Information leakage through timing attacks

8. **Business Logic Security**:
   - Access control flaws
   - Privilege escalation opportunities
   - Business logic bypass vulnerabilities
   - Rate limiting and DoS protection

9. **Compliance & Standards**:
   - OWASP Top 10 vulnerabilities
   - CWE (Common Weakness Enumeration) issues
   - Industry-specific compliance gaps
   - Security best practices adherence

10. **Incident Response Readiness**:
    - Logging and monitoring capabilities
    - Audit trail completeness
    - Security event detection
    - Forensics readiness

**Security Severity Assessment**: Rate issues as CRITICAL, HIGH, MEDIUM, or LOW based on exploitability and impact.

**Attack Scenarios**: For major vulnerabilities, provide realistic attack scenarios that demonstrate the security risk.

Be thorough and assume an adversarial mindset. Think like an attacker trying to compromise this system.`;
  }

  private buildBestPracticesReviewPrompt(params: BestPracticesReviewParams): string {
    const focusSection = params.practicesFocus 
      ? `\n\nSpecial Focus Area: ${params.practicesFocus}\nPay particular attention to this area in your best practices review.`
      : '';

    const languageSection = params.language 
      ? `\n\nPrimary Language: ${params.language}\nInclude language-specific best practices and conventions for ${params.language}.`
      : '';

    return `You are a senior software architect and engineering team lead conducting a comprehensive best practices review. Your role is to ensure code quality, maintainability, and adherence to industry standards and conventions.

Codebase to Review for Best Practices:
${params.codebaseContext}${focusSection}${languageSection}

Please provide a JSON response with the following structure:
{
  "approved": boolean,
  "feedback": {
    "summary": "Brief overall assessment of best practices adherence",
    "issues": ["List of best practice violations and areas for improvement"],
    "suggestions": ["List of specific recommendations to improve code quality"],
    "strengths": ["List of good practices already implemented"]
  },
  "metadata": {
    "confidence": 0.0-1.0
  }
}

Focus your best practices review on these critical areas:

1. **Code Organization & Architecture**:
   - Separation of concerns and single responsibility principle
   - Proper layering and module boundaries
   - Appropriate use of design patterns
   - Clear project structure and file organization
   - Dependency injection and inversion of control

2. **Naming Conventions & Readability**:
   - Descriptive and consistent naming for variables, functions, classes
   - Clear and intention-revealing names
   - Consistent naming conventions throughout codebase
   - Appropriate use of abbreviations and acronyms
   - Self-documenting code practices

3. **Function & Method Design**:
   - Function length and complexity (keep functions small)
   - Single responsibility for each function
   - Appropriate parameter counts and types
   - Pure functions vs. side effects
   - Proper return value handling

4. **Error Handling & Resilience**:
   - Consistent error handling patterns
   - Appropriate use of exceptions vs. error codes
   - Graceful degradation strategies
   - Input validation and sanitization
   - Proper logging of errors and failures

5. **Documentation & Comments**:
   - Clear and up-to-date documentation
   - Appropriate use of inline comments
   - API documentation completeness
   - README files and setup instructions
   - Code comments explaining "why" not "what"

6. **Testing Practices**:
   - Unit test coverage and quality
   - Integration and end-to-end testing
   - Test-driven development adherence
   - Mock and stub usage
   - Test organization and maintainability

7. **Performance & Efficiency**:
   - Algorithm complexity considerations
   - Memory usage optimization
   - Database query efficiency
   - Caching strategies
   - Resource cleanup and disposal

8. **Code Duplication & DRY Principle**:
   - Identification of repeated code patterns
   - Proper abstraction and reusability
   - Shared utility functions and libraries
   - Configuration management
   - Template and code generation usage

9. **Version Control & Collaboration**:
   - Commit message quality and consistency
   - Branch naming and strategy
   - Code review practices
   - Merge conflict resolution
   - Continuous integration setup

10. **Maintainability & Technical Debt**:
    - Code complexity metrics
    - Refactoring opportunities
    - Legacy code modernization
    - Dependency management
    - Backward compatibility considerations

11. **Language-Specific Best Practices** (if language specified):
    - Idiomatic code patterns for the language
    - Language-specific conventions and standards
    - Framework-specific best practices
    - Package/module organization patterns
    - Language feature utilization

12. **Logging & Monitoring**:
    - Appropriate logging levels and messages
    - Structured logging practices
    - Performance monitoring integration
    - Debug information availability
    - Log rotation and management

**Priority Assessment**: Rate improvement areas as HIGH, MEDIUM, or LOW priority based on impact on maintainability and code quality.

**Refactoring Recommendations**: Provide specific, actionable suggestions for improving code structure and practices.

**Industry Standards**: Reference relevant coding standards, style guides, and best practice frameworks (e.g., Clean Code, SOLID principles, language-specific standards).

Be constructive and focus on practical improvements that will enhance code quality, team productivity, and long-term maintainability.`;
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