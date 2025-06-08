/**
 * Storage Manager
 * Handles temporary file storage and cleanup
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { logger } from '../utils/logger.js';
import type { ServerConfig } from '../types/index.js';

export interface TaskContext {
  taskId: string;
  plan: string;
  preSnapshot: string | null;
  postSnapshot: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMB: number;
}

export class StorageManager {
  private basePath: string;
  private config: Partial<ServerConfig>;
  private encryptionKey: Buffer;
  
  constructor(config: Partial<ServerConfig> = {}) {
    this.config = config;
    this.basePath = config.storageBasePath || path.join(os.homedir(), '.tmp', 'software-architect-mcp');
    // Use a consistent encryption key (in production, this should be from secure config)
    this.encryptionKey = crypto.scryptSync('default-encryption-key', 'salt', 32);
    logger.info(`Storage manager initialized with base path: ${config}`);
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.basePath);
  }

  async storeCodebaseSnapshot(
    taskId: string,
    content: string,
    snapshotType: 'pre' | 'post'
  ): Promise<string> {
    // Check size limit
    const contentSizeBytes = Buffer.byteLength(content, 'utf-8');
    const maxSizeBytes = (this.config.maxCodebaseSizeMB || 100) * 1024 * 1024;
    
    if (contentSizeBytes > maxSizeBytes) {
      throw new Error(`Content size exceeds maximum size of ${this.config.maxCodebaseSizeMB}MB`);
    }

    const filePath = this.getSnapshotPath(taskId, snapshotType);
    
    // Encrypt if enabled
    let dataToStore = content;
    if (this.config.encryptTempFiles) {
      dataToStore = this.encrypt(content);
    }

    await fs.writeFile(filePath, dataToStore, 'utf-8');
    return filePath;
  }

  async getCodebaseSnapshot(
    taskId: string,
    snapshotType: 'pre' | 'post'
  ): Promise<string | null> {
    const filePath = this.getSnapshotPath(taskId, snapshotType);
    
    if (!(await fs.pathExists(filePath))) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    
    // Decrypt if enabled
    if (this.config.encryptTempFiles) {
      return this.decrypt(content);
    }
    
    return content;
  }

  async storeTaskContext(context: TaskContext): Promise<void> {
    const filePath = this.getContextPath(context.taskId);
    const data = JSON.stringify(context, null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  async getTaskContext(taskId: string): Promise<TaskContext | null> {
    const filePath = this.getContextPath(taskId);
    
    if (!(await fs.pathExists(filePath))) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  async cleanupOldSnapshots(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.basePath);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.basePath, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAgeMs) {
          await fs.unlink(filePath);
          logger.info(`Removed old snapshot: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  async cleanupTaskFiles(taskId: string): Promise<void> {
    const files = await fs.readdir(this.basePath);
    const taskFiles = files.filter(file => file.includes(taskId));

    for (const file of taskFiles) {
      const filePath = path.join(this.basePath, file);
      await fs.unlink(filePath);
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    const files = await fs.readdir(this.basePath);
    let totalSizeBytes = 0;

    for (const file of files) {
      const filePath = path.join(this.basePath, file);
      const stats = await fs.stat(filePath);
      totalSizeBytes += stats.size;
    }

    return {
      totalFiles: files.length,
      totalSizeBytes,
      totalSizeMB: totalSizeBytes / (1024 * 1024)
    };
  }

  private getSnapshotPath(taskId: string, snapshotType: 'pre' | 'post'): string {
    const safeTaskId = this.sanitizeTaskId(taskId);
    return path.join(this.basePath, `${safeTaskId}-${snapshotType}-snapshot.txt`);
  }

  private getContextPath(taskId: string): string {
    const safeTaskId = this.sanitizeTaskId(taskId);
    return path.join(this.basePath, `${safeTaskId}-context.json`);
  }

  private sanitizeTaskId(taskId: string): string {
    // Remove any path traversal attempts and unsafe characters
    return taskId.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/\.+/g, '');
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to the encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
} 