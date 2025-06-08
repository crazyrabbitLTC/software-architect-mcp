# Software Architect MCP Server

An intelligent code review assistant that provides pre-task planning reviews and post-task implementation reviews through the Model Context Protocol (MCP).

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

## What It Does

The server provides two MCP tools that act as quality gates for AI-driven development:

- **`review_plan`** - Reviews implementation plans before coding begins
- **`review_implementation`** - Reviews completed code changes against original plans

### Flow
1. LLM calls MCP tool → 2. Tool flattens codebase with Repomix → 3. Sends to Gemini for review → 4. Returns structured feedback

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

## API

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

## Environment Variables

- `GEMINI_API_KEY` - Required Google Gemini API key
- `GEMINI_PRO_MODEL` - Model for plan reviews (default: gemini-1.5-pro)
- `GEMINI_FLASH_MODEL` - Model for implementation reviews (default: gemini-1.5-flash)

## Development

```bash
npm run dev          # Development mode with file watching
npm test             # Run test suite
npm run build        # TypeScript compilation
npm run lint         # ESLint checking
```

## Technologies

- **TypeScript** - Primary development language
- **Model Context Protocol SDK** - For MCP server implementation
- **Repomix** - Codebase flattening and analysis (bundled)
- **Google Gemini API** - AI-powered code review
- **Node.js** - Runtime environment

## Author

Dennison Bertram - dennison@tally.xyz

## License

MIT License - see [LICENSE](LICENSE) file for details.