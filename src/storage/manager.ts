/**
 * Storage Manager for handling code snapshots and task contexts
 */

import fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { logger } from '../utils/logger.js';
import type { StorageConfig, TaskContext } from '../types/index.js';

export class StorageManager {
  private basePath: string;
  private config: StorageConfig;
  private encryptionKey?: Buffer;

  constructor(config: StorageConfig) {
    this.config = config;
    this.basePath = config.basePath;
    
    if (config.encrypt) {
      // Generate a consistent encryption key based on system info
      const systemId = `${os.hostname()}-${os.userInfo().username}`;
      this.encryptionKey = crypto.scryptSync(systemId, 'software-architect-mcp', 32);
    }
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.basePath);
    await fs.ensureDir(path.join(this.basePath, 'snapshots'));
    await fs.ensureDir(path.join(this.basePath, 'tasks'));
    logger.info(`Storage initialized at: ${this.basePath}`);
  }

  async storeSnapshot(taskId: string, content: string, type: 'pre' | 'post'): Promise<string> {
    const snapshotId = `${taskId}-${type}-${Date.now()}`;
    const filePath = path.join(this.basePath, 'snapshots', `${snapshotId}.txt`);
    
    // Check size limit
    const sizeInBytes = Buffer.byteLength(content, 'utf8');
    const maxSizeBytes = (this.config.maxSizeMB || 100) * 1024 * 1024;
    
    if (sizeInBytes > maxSizeBytes) {
      throw new Error(`Content size exceeds maximum size of ${this.config.maxSizeMB}MB`);
    }
    
    let dataToStore = content;
    
    if (this.config.encrypt && this.encryptionKey) {
      dataToStore = this.encrypt(content);
    }
    
    await fs.writeFile(filePath, dataToStore);
    logger.info(`Stored ${type} snapshot for task ${taskId}: ${snapshotId}`);
    
    return snapshotId;
  }

  async retrieveSnapshot(snapshotId: string): Promise<string> {
    const filePath = path.join(this.basePath, 'snapshots', `${snapshotId}.txt`);
    
    if (!await fs.pathExists(filePath)) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    
    let content = await fs.readFile(filePath, 'utf8');
    
    // Handle case where content might be a Buffer
    if (Buffer.isBuffer(content)) {
      content = content.toString('utf8');
    }
    
    if (this.config.encrypt && this.encryptionKey) {
      content = this.decrypt(content);
    }
    
    return content;
  }

  async storeTaskContext(taskId: string, context: TaskContext): Promise<void> {
    const filePath = path.join(this.basePath, 'tasks', `${taskId}.json`);
    
    let dataToStore = JSON.stringify(context, null, 2);
    
    if (this.config.encrypt && this.encryptionKey) {
      dataToStore = this.encrypt(dataToStore);
    }
    
    await fs.writeFile(filePath, dataToStore);
    logger.info(`Stored task context for: ${taskId}`);
  }

  async retrieveTaskContext(taskId: string): Promise<TaskContext | null> {
    const filePath = path.join(this.basePath, 'tasks', `${taskId}.json`);
    
    if (!await fs.pathExists(filePath)) {
      return null;
    }
    
    let content = await fs.readFile(filePath, 'utf8');
    
    // Handle case where content might be a Buffer
    if (Buffer.isBuffer(content)) {
      content = content.toString('utf8');
    }
    
    if (this.config.encrypt && this.encryptionKey) {
      content = this.decrypt(content);
    }
    
    return JSON.parse(content) as TaskContext;
  }

  private encrypt(text: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    const iv = crypto.randomBytes(12); // GCM typically uses 12-byte IV
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    // Handle case where encryptedText might be a Buffer
    let textToDecrypt = encryptedText;
    if (Buffer.isBuffer(encryptedText)) {
      textToDecrypt = encryptedText.toString('utf8');
    }
    
    const parts = textToDecrypt.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async cleanup(olderThanDays: number = 7): Promise<void> {
    const snapshots = await fs.readdir(path.join(this.basePath, 'snapshots'));
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    for (const file of snapshots) {
      const filePath = path.join(this.basePath, 'snapshots', file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtimeMs < cutoffTime) {
        await fs.remove(filePath);
        logger.info(`Cleaned up old snapshot: ${file}`);
      }
    }
  }

  async getStorageStats(): Promise<{
    totalSnapshots: number;
    totalTasks: number;
    totalSizeMB: number;
  }> {
    const snapshots = await fs.readdir(path.join(this.basePath, 'snapshots'));
    const tasks = await fs.readdir(path.join(this.basePath, 'tasks'));
    
    let totalSize = 0;
    
    for (const file of [...snapshots, ...tasks]) {
      const filePath = path.join(this.basePath, file.includes('.json') ? 'tasks' : 'snapshots', file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }
    
    return {
      totalSnapshots: snapshots.length,
      totalTasks: tasks.length,
      totalSizeMB: totalSize / (1024 * 1024)
    };
  }

  sanitizePath(inputPath: string): string {
    // Remove any directory traversal attempts
    return path.basename(inputPath).replace(/[^a-zA-Z0-9._-]/g, '');
  }
} 