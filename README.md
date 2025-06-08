# Software Architect MCP Server

An intelligent code review assistant that integrates with LLMs through the Model Context Protocol (MCP) to provide pre-task planning reviews and post-task implementation reviews.

## Overview

The Software Architect MCP Server acts as a quality gate for AI-driven development workflows. It leverages:
- **Repomix** for flattening and analyzing codebases
- **Google Gemini** for intelligent code review with large context capabilities
- **Model Context Protocol** for seamless integration with any MCP-compatible LLM

## Key Features

### 🎯 Pre-Task Review
Before implementing any code changes, the LLM can submit its plan for review. The server will:
- Analyze the current codebase state
- Evaluate the proposed implementation approach
- Provide feedback on architectural alignment, potential issues, and suggestions

### 🔍 Post-Task Review
After completing implementation, the LLM can request a review of the changes:
- Compare before/after codebase states
- Assess adherence to the original plan
- Identify code quality issues and best practice violations

## Architecture

```
LLM → MCP Server → Repomix → Gemini → Structured Feedback → LLM
```

## Project Structure

- `/docs` - Project documentation including the PRD
- `/.taskmaster` - Task management and project configuration
- `/src` - Source code (to be created)
- `/tests` - Test files (to be created)

## Development Status

This project is currently in the planning phase. See the [Product Requirements Document](docs/prd-software-architect-mcp.md) for detailed specifications.

### Current Tasks

The project has been broken down into 15 main development tasks:
1. Setup MCP Server Project Structure
2. Implement Core MCP Server
3. Develop Storage Manager
4. Implement Repomix Integration
5. Develop Gemini API Client
6. Create Review Engine
7. Implement Tool Handlers
8. Develop Configuration System
9. Implement Security Features
10. Develop Prompt Engineering Templates
11. Implement Task Context Management
12. Develop Performance Optimization
13. Implement Error Handling and Logging
14. Create Documentation and Examples
15. Implement Testing Framework

## Getting Started

(Coming soon - development in progress)

## Technologies

- **TypeScript** - Primary development language
- **Model Context Protocol SDK** - For MCP server implementation
- **Repomix** - Codebase flattening and analysis
- **Google Gemini API** - AI-powered code review
- **Node.js** - Runtime environment

## License

(To be determined) 