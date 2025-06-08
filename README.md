# Software Architect MCP Server

An intelligent code review assistant that provides comprehensive code analysis through the Model Context Protocol (MCP). Offers pre-task planning reviews, post-task implementation reviews, and general codebase analysis powered by Google Gemini's large context capabilities.

## ✨ Features

- **🔍 Pre-Task Planning Review** - Validates implementation plans against full codebase context
- **📊 Post-Implementation Review** - Compares completed work against original plans using diff analysis  
- **🏗️ General Code Review** - Analyzes entire codebases for architecture, security, and best practices
- **🔒 Secure Storage** - AES-256-GCM encryption for task contexts and code snapshots
- **📈 Performance Monitoring** - Built-in timing and metrics for all operations
- **🛡️ Robust Error Handling** - Structured validation, logging, and error recovery
- **🔄 Context Persistence** - Links pre/post reviews with task context management

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env and add your Gemini API key
   ```

3. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

4. **Test with JSON input:**
   ```bash
   echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "review_plan", "arguments": {"taskId": "test-123", "taskDescription": "Test feature", "implementationPlan": "I will implement a test feature", "codebasePath": "."}}}' | npm start
   ```

## How It Works

The server acts as a **context firewall** - processing large codebases internally and returning concise, actionable feedback to AI assistants:

```
LLM → MCP Tool → Repomix Flattening → Gemini Analysis → Structured Review → LLM
```

**Key Benefits:**
- ✅ Prevents context window bloat in calling LLMs
- ✅ Leverages Gemini's 2M+ token context for full codebase analysis  
- ✅ Provides consistent, structured feedback format
- ✅ Maintains task context between planning and implementation phases

## Usage with AI Assistants

### Claude Code (claude.ai/code)

Add to your MCP settings in `~/.claude/mcp_servers.json`:

```json
{
  "software-architect": {
    "command": "node",
    "args": ["/path/to/software-architect-mcp/dist/index.js"],
    "env": {
      "GEMINI_API_KEY": "your-api-key-here"
    }
  }
}
```

### Cursor

Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "software-architect": {
      "command": "node",
      "args": ["/path/to/software-architect-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## API Reference

### 🎯 review_plan
Reviews implementation plans before execution:
```json
{
  "taskId": "unique-task-id",
  "taskDescription": "Description of task",  
  "implementationPlan": "Detailed implementation plan",
  "codebasePath": "path/to/codebase"
}
```

**Returns:** Structured feedback with approval status, issues, suggestions, and strengths.

### 🔄 review_implementation  
Reviews completed implementations against original plans:
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

**Returns:** Comparative analysis of implementation vs. plan with detailed feedback.

### 🏗️ code_review
General codebase analysis and review:
```json
{
  "codebasePath": "path/to/codebase",
  "reviewFocus": "architecture|security|performance" // optional
}
```

**Returns:** Comprehensive codebase analysis with architectural recommendations.

## Architecture

### Core Components

- **ReviewEngine** - Orchestrates the complete review workflow
- **GeminiClient** - Handles AI model communication with structured prompts
- **StorageManager** - Manages encrypted snapshots and task contexts  
- **CodeFlattener** - Bundles Repomix for codebase processing
- **MCPServer** - Exposes tools via Model Context Protocol

### Security Features

- **🔐 AES-256-GCM Encryption** - Authenticated encryption for stored data
- **🛡️ Input Validation** - Comprehensive parameter validation and sanitization
- **📝 Audit Logging** - Detailed operation logs with performance metrics
- **🚫 Path Sanitization** - Prevents directory traversal attacks
- **⏰ Automatic Cleanup** - Configurable retention policies for temporary data

### Performance Optimizations

- **📊 Performance Monitoring** - Built-in timing for all operations
- **🗂️ Efficient Storage** - Temporary file management with size limits
- **⚡ Model Selection** - Pro model for complex planning, Flash for implementation
- **🔄 Context Reuse** - Persistent task contexts between review phases

## Environment Variables

- `GEMINI_API_KEY` - Required Google Gemini API key
- `GEMINI_PRO_MODEL` - Model for plan reviews (default: gemini-1.5-pro)
- `GEMINI_FLASH_MODEL` - Model for implementation reviews (default: gemini-1.5-flash)

## Development

```bash
npm run dev          # Development mode with file watching
npm test             # Run comprehensive test suite
npm run build        # TypeScript compilation
npm run lint         # ESLint checking
```

### Testing
- **Unit Tests** - All core components with 95%+ coverage
- **Integration Tests** - End-to-end workflow validation
- **Mock Strategy** - No external API calls in tests

## Technologies

- **TypeScript** - Primary development language with strict typing
- **Model Context Protocol SDK** - For MCP server implementation
- **Repomix** - Codebase flattening and analysis (bundled)
- **Google Gemini API** - AI-powered code review with large context
- **Vitest** - Modern testing framework
- **Winston** - Structured logging
- **Node.js** - Runtime environment

## Production Deployment

The server is production-ready with:

- ✅ **Robust Error Handling** - Structured error codes and recovery
- ✅ **Security Hardening** - Encrypted storage and input validation  
- ✅ **Performance Monitoring** - Built-in metrics and logging
- ✅ **Scalable Architecture** - Modular design for easy extension
- ✅ **Comprehensive Testing** - Unit and integration test coverage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Author

Dennison Bertram - dennison@tally.xyz

## License

MIT License - see [LICENSE](LICENSE) file for details.