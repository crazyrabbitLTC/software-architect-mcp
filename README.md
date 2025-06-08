# CodeSentry MCP 🛡️

**AI-powered code review assistant for LLM development workflows**

CodeSentry is a Model Context Protocol (MCP) server that provides comprehensive code review capabilities through 5 specialized review tools. Built for Cursor, Claude Code, and other MCP-compatible AI assistants.

## ✨ Features

🔍 **Plan Review** - Validates implementation plans against codebase context  
📊 **Implementation Review** - Compares completed work vs. original plans  
🏗️ **Code Review** - General codebase analysis with focus areas  
🔒 **Security Review** - Vulnerability assessment and security analysis  
📐 **Best Practices Review** - Code quality and maintainability analysis  

## 🚀 Quick Start

### For Cursor

1. **Install & Build:**
   ```bash
   git clone https://github.com/crazyrabbitLTC/software-architect-mcp.git
   cd software-architect-mcp
   npm install && npm run build
   ```

2. **Add to Cursor Settings** (`Cmd/Ctrl + ,` → Extensions → MCP):
   ```json
   {
     "mcpServers": {
       "codesentry": {
         "command": "node",
         "args": ["/path/to/software-architect-mcp/dist/index.js"],
         "env": {
           "GEMINI_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

3. **Get API Key:** [Google AI Studio](https://aistudio.google.com/app/apikey)

4. **Use in Chat:**
   ```
   @codesentry Please review this codebase for security issues
   ```

### For Claude Code

1. **Complete steps 1-3 above**

2. **Add to MCP Settings** (`~/.claude/mcp_servers.json`):
   ```json
   {
     "codesentry": {
       "command": "node",
       "args": ["/path/to/software-architect-mcp/dist/index.js"],
       "env": {
         "GEMINI_API_KEY": "your-api-key-here"
       }
     }
   }
   ```

## 🔧 Available Tools

### `security_review`
```typescript
// Comprehensive security vulnerability assessment
{
  "codebasePath": "./src",
  "securityFocus": "authentication" // optional
}
```

### `best_practices_review`
```typescript
// Code quality and maintainability analysis
{
  "codebasePath": "./src", 
  "practicesFocus": "testing", // optional
  "language": "TypeScript" // optional
}
```

### `code_review`
```typescript
// General codebase analysis
{
  "codebasePath": "./src",
  "reviewFocus": "performance" // optional
}
```

### `review_plan`
```typescript
// Pre-task planning validation
{
  "taskId": "feature-123",
  "taskDescription": "Add user authentication",
  "implementationPlan": "Use JWT with refresh tokens...",
  "codebasePath": "./src"
}
```

### `review_implementation`
```typescript
// Post-task implementation review
{
  "taskId": "feature-123",
  "taskDescription": "Add user authentication", 
  "originalPlan": "Use JWT with refresh tokens...",
  "implementationSummary": "Implemented JWT auth with Redis...",
  "beforePath": "./before",
  "afterPath": "./after"
}
```

## 🏗️ How It Works

```
AI Assistant → MCP Tool → Repomix Analysis → Gemini Review → Structured Feedback
```

**Benefits:**
- ✅ Handles large codebases without context window limits
- ✅ Leverages Gemini's 2M+ token context for full analysis
- ✅ Returns concise, actionable feedback
- ✅ Maintains context between planning and implementation

## 🛡️ Security & Privacy

- **🔐 Local Processing** - Your code stays on your machine
- **🔑 API Key Security** - Environment variables only
- **🗑️ Auto Cleanup** - Temporary files automatically deleted
- **📝 Audit Logging** - Comprehensive operation logs

## 🧪 Development

```bash
npm run dev          # Development mode
npm test             # Run test suite (32 tests)
npm run build        # TypeScript build
npm run lint         # Code linting
```

## 📋 Requirements

- **Node.js** 18+
- **Google Gemini API Key** ([Get one free](https://aistudio.google.com/app/apikey))
- **MCP-compatible AI Assistant** (Cursor, Claude Code, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality  
4. Submit a pull request

## 👨‍💻 Authors

**Dennison Bertram** - *Creator & Maintainer*  
GitHub: [@crazyrabbitLTC](https://github.com/crazyrabbitLTC)  
Email: dennison@tally.xyz

**Claude (Anthropic)** - *AI Development Partner*  
Assisted with architecture, implementation, and testing

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**⭐ Star this repo if CodeSentry helps improve your code quality!**