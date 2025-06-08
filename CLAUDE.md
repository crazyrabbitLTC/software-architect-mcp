# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides intelligent code review capabilities for LLM-driven development workflows. It acts as a quality gate, offering pre-task planning reviews and post-task implementation reviews by leveraging codebase analysis through Repomix and Google Gemini's large context capabilities.

## Core Architecture

The server exposes two main MCP tools:
- `review_plan`: Pre-task review that analyzes implementation plans against the current codebase
- `review_implementation`: Post-task review that compares implementations against original plans

### Key Components

- **MCPServer** (`src/core/server.ts`): Main MCP server implementation that handles tool registration and request processing
- **GeminiClient** (`src/gemini/client.ts`): Manages Google Gemini API interactions for code reviews
- **CodeFlattener** (`src/repomix/flattener.ts`): Uses Repomix to flatten codebases for AI analysis
- **StorageManager** (`src/storage/manager.ts`): Handles temporary storage of code snapshots and task contexts with optional encryption

## Development Commands

### Build and Test
```bash
npm run build          # TypeScript compilation
npm test              # Run test suite with Vitest
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run typecheck     # Type checking without compilation
```

### Development
```bash
npm run dev           # Development mode with file watching
npm start             # Start the MCP server
npm run lint          # ESLint checking
npm run lint:fix      # Fix linting issues
```

### Manual Testing
```bash
./test-server.sh      # Test server initialization
./test-review.sh      # Test review tools (requires GEMINI_API_KEY)
```

## Environment Setup

Copy `env.example` to `.env` and configure:
- `GEMINI_API_KEY`: Required Google Gemini API key
- `GEMINI_PRO_MODEL`: Model for plan reviews (default: gemini-2.0-pro)
- `GEMINI_FLASH_MODEL`: Model for implementation reviews (default: gemini-2.0-flash)

## MCP Tool Usage

### review_plan
Reviews implementation plans before execution:
```json
{
  "taskId": "unique-task-id",
  "taskDescription": "Description of task",
  "implementationPlan": "Detailed implementation plan",
  "codebasePath": "path/to/codebase"
}
```

### review_implementation  
Reviews completed implementations:
```json
{
  "taskId": "same-task-id-from-plan",
  "taskDescription": "Description of completed task", 
  "originalPlan": "Original plan from review_plan",
  "implementationSummary": "What was actually implemented",
  "beforePath": "path/to/codebase/before", 
  "afterPath": "path/to/codebase/after"
}
```

## Security Notes

- API keys are loaded from environment variables, never hardcoded
- Temporary files can be encrypted using the StorageManager encryption feature
- Code snapshots are stored in `/tmp/software-architect-mcp` by default
- Delete test scripts after use to avoid committing temporary test data

## Testing Strategy

The project uses Vitest with comprehensive test coverage for:
- MCP server initialization and tool registration
- Gemini API client with mocked responses
- Storage manager with encryption/decryption
- Error handling and edge cases

Tests are not trivial - they focus on core functionality and integration points rather than simple unit tests.