#!/usr/bin/env node

/**
 * Software Architect MCP Server
 * Main entry point for the Model Context Protocol server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

async function main() {
  logger.info('Starting Software Architect MCP Server...');

  const server = new Server(
    {
      name: process.env.MCP_SERVER_NAME || 'software-architect-mcp',
      version: process.env.MCP_SERVER_VERSION || '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // TODO: Register tools
  // server.setRequestHandler(ListToolsRequestSchema, handleListTools);
  // server.setRequestHandler(CallToolRequestSchema, handleCallTool);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Software Architect MCP Server is running');
}

main().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
}); 