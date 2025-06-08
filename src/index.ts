#!/usr/bin/env node

/**
 * Software Architect MCP Server
 * Main entry point for the Model Context Protocol server
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPServer } from './core/server.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Disable console.log to avoid interfering with stdio transport
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.error = () => {};

async function main() {
  try {
    // Validate required environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    // Create server instance with configuration
    const mcpServer = new MCPServer({
      name: 'software-architect-mcp',
      version: '0.1.0',
      gemini: {
        apiKey,
        proModel: process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro',
        flashModel: process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash'
      }
    });

    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Start the server
    await mcpServer.start(transport);
    
    // Keep process alive
    process.stdin.resume();
    
    logger.info('Software Architect MCP server started successfully');
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

main().catch((error) => {
  logger.error('Unhandled error in main', error);
  process.exit(1);
}); 