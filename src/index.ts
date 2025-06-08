#!/usr/bin/env node

/**
 * Software Architect MCP Server
 * Main entry point for the Model Context Protocol server
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { MCPServer } from './core/server.js';

// Load environment variables
dotenv.config();

async function main() {
  logger.info('Starting Software Architect MCP Server...');

  try {
    // Create and configure the MCP server
    const mcpServer = new MCPServer();
    
    // Register tools
    mcpServer.registerTools();
    
    // Start the server
    await mcpServer.start();

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await mcpServer.getServer().connect(transport);

    logger.info('Software Architect MCP Server is running and connected via stdio');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  logger.error('Unhandled error in main:', error);
  process.exit(1);
}); 