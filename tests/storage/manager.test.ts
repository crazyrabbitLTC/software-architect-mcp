import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from '../../src/storage/manager.js';
import type { PathLike, Stats } from 'fs';
import * as fs from 'fs-extra';
import * as path from 'path';
import type { StorageConfig, TaskContext } from '../../src/types/index.js';

// Mock fs-extra
vi.mock('fs-extra', () => ({
  ensureDir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(''),
  pathExists: vi.fn().mockResolvedValue(false),
  readdir: vi.fn().mockResolvedValue([]),
  stat: vi.fn().mockResolvedValue({ size: 0, mtimeMs: 0 } as Stats),
  remove: vi.fn().mockResolvedValue(undefined)
}));

describe('StorageManager', () => {
  let storage: StorageManager;
  const testBasePath = '/tmp/test-storage';
  
  const testConfig: StorageConfig = {
    basePath: testBasePath,
    encrypt: false,
    maxSizeMB: 100
  };

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageManager(testConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create required directories on initialize', async () => {
      await storage.initialize();
      
      expect(fs.ensureDir).toHaveBeenCalledWith(testBasePath);
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(testBasePath, 'snapshots'));
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(testBasePath, 'tasks'));
    });
  });

  describe('snapshot management', () => {
    it('should store pre-implementation snapshot', async () => {
      const taskId = 'test-123';
      const content = 'test content';
      
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
      
      const snapshotId = await storage.storeSnapshot(taskId, content, 'pre');
      
      expect(snapshotId).toContain(taskId);
      expect(snapshotId).toContain('pre');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(snapshotId),
        content
      );
    });

    it('should store post-implementation snapshot', async () => {
      const taskId = 'test-123';
      const content = 'test content';
      
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
      
      const snapshotId = await storage.storeSnapshot(taskId, content, 'post');
      
      expect(snapshotId).toContain(taskId);
      expect(snapshotId).toContain('post');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(snapshotId),
        content
      );
    });

    it('should enforce size limits', async () => {
      const content = 'x'.repeat(101 * 1024 * 1024); // 101MB
      
      await expect(storage.storeSnapshot('test', content, 'pre'))
        .rejects.toThrow('exceeds maximum size');
    });

    it('should retrieve snapshot', async () => {
      const snapshotId = 'test-123-pre-1234567890';
      const content = 'test content';
      
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(content));
      
      const retrieved = await storage.retrieveSnapshot(snapshotId);
      
      expect(retrieved).toBe(content);
    });

    it('should throw error if snapshot not found', async () => {
      vi.mocked(fs.pathExists).mockResolvedValueOnce(false);
      
      await expect(storage.retrieveSnapshot('nonexistent'))
        .rejects.toThrow('Snapshot not found');
    });
  });

  describe('task context management', () => {
    const testContext: TaskContext = {
      taskId: 'test-123',
      taskDescription: 'Test task',
      plan: 'Test plan',
      implementation: 'Test implementation',
      preSnapshot: 'snapshot-1',
      postSnapshot: 'snapshot-2',
      reviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should store task context', async () => {
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
      
      await storage.storeTaskContext(testContext.taskId, testContext);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(testContext.taskId),
        expect.any(String)
      );
    });

    it('should retrieve task context', async () => {
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(JSON.stringify(testContext)));
      
      const retrieved = await storage.retrieveTaskContext(testContext.taskId);
      
      expect(retrieved).toEqual(testContext);
    });

    it('should return null if task context not found', async () => {
      vi.mocked(fs.pathExists).mockResolvedValueOnce(false);
      
      const retrieved = await storage.retrieveTaskContext('nonexistent');
      
      expect(retrieved).toBeNull();
    });
  });

  describe('encryption', () => {
    let encryptedStorage: StorageManager;
    
    beforeEach(() => {
      encryptedStorage = new StorageManager({
        ...testConfig,
        encrypt: true
      });
    });

    it('should encrypt content when storing snapshot', async () => {
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
      
      const content = 'sensitive data';
      const snapshotId = await encryptedStorage.storeSnapshot('test', content, 'pre');
      
      const writtenData = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(writtenData).not.toBe(content);
      expect(writtenData).toContain(':'); // IV separator
    });

    it('should decrypt content when retrieving snapshot', async () => {
      const content = 'sensitive data';
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      
      // Store encrypted content
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
      const snapshotId = await encryptedStorage.storeSnapshot('test', content, 'pre');
      const encryptedData = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      
      // Retrieve and decrypt
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(encryptedData));
      const retrieved = await encryptedStorage.retrieveSnapshot(snapshotId);
      
      expect(retrieved).toBe(content);
    });
  });

  describe('cleanup', () => {
    it('should remove old snapshots', async () => {
      const now = Date.now();
      const oldDate = now - (8 * 24 * 60 * 60 * 1000); // 8 days old
      
      vi.mocked(fs.readdir).mockResolvedValueOnce(['old-snapshot.txt', 'new-snapshot.txt']);
      vi.mocked(fs.stat).mockImplementation((path: PathLike) => {
        return Promise.resolve({
          mtimeMs: path.toString().includes('old') ? oldDate : now,
          size: 0,
          isFile: () => true,
          isDirectory: () => false,
          isSymbolicLink: () => false,
          dev: 0,
          ino: 0,
          mode: 0,
          nlink: 1,
          uid: 0,
          gid: 0,
          rdev: 0,
          blksize: 4096,
          blocks: 0,
          atimeMs: now,
          ctimeMs: now,
          birthtimeMs: now,
          atime: new Date(now),
          mtime: new Date(now),
          ctime: new Date(now),
          birthtime: new Date(now)
        } as Stats);
      });
      
      await storage.cleanup(7); // 7 days threshold
      
      expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining('old-snapshot.txt'));
      expect(fs.remove).not.toHaveBeenCalledWith(expect.stringContaining('new-snapshot.txt'));
    });
  });

  describe('storage stats', () => {
    it('should return storage statistics', async () => {
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path.toString().includes('snapshots')) {
          return Promise.resolve(['snap1.txt', 'snap2.txt']);
        }
        return Promise.resolve(['task1.json']);
      });
      
      vi.mocked(fs.stat).mockResolvedValue({
        size: 1024 * 1024, // 1MB
        mtimeMs: Date.now(),
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => false,
        dev: 0,
        ino: 0,
        mode: 0,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: 0,
        blksize: 4096,
        blocks: 0,
        atimeMs: Date.now(),
        ctimeMs: Date.now(),
        birthtimeMs: Date.now(),
        atime: new Date(),
        mtime: new Date(),
        ctime: new Date(),
        birthtime: new Date()
      } as Stats);
      
      const stats = await storage.getStorageStats();
      
      expect(stats.totalSnapshots).toBe(2);
      expect(stats.totalTasks).toBe(1);
      expect(stats.totalSizeMB).toBeGreaterThan(0);
    });
  });

  describe('path sanitization', () => {
    it('should sanitize unsafe paths', () => {
      const unsafePath = '../../../etc/passwd';
      const sanitized = storage.sanitizePath(unsafePath);
      
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });
  });
}); 