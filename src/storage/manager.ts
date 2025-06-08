/**
 * Storage Manager
 * Handles temporary file storage and cleanup
 */

import { logger } from '../utils/logger.js';
import type { StoredTask } from '../types/index.js';

export class StorageManager {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    logger.info(`Storage manager initialized with base path: ${basePath}`);
  }

  // TODO: Implement snapshot storage
  // TODO: Implement cleanup policies
  // TODO: Implement task context storage
} 