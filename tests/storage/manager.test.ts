import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from '../../src/storage/manager.js';
import fs from 'fs-extra';
import type { ServerConfig } from '../../src/types/index.js';

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    pathExists: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    remove: vi.fn()
  }
}));

describe('StorageManager', () => {
  let storageManager: StorageManager;
  const testBasePath = '/test/.tmp';
  const testConfig: Partial<ServerConfig> = {
    storageBasePath: testBasePath,
    encryptTempFiles: false,
    maxCodebaseSizeMB: 100
  };

  beforeEach(() => {
    vi.clearAllMocks();
    storageManager = new StorageManager(testConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create storage directory on initialization', async () => {
      await storageManager.initialize();
      
      expect(fs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining(testBasePath)
      );
    });

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(fs.ensureDir).mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(storageManager.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('Storing Snapshots', () => {
    it('should store codebase snapshot with correct filename', async () => {
      const taskId = 'test-123';
      const content = 'test codebase content';
      const snapshotType = 'pre';
      
      vi.mocked(fs.writeFile).mockResolvedValueOnce();
      
      const filePath = await storageManager.storeCodebaseSnapshot(
        taskId,
        content,
        snapshotType
      );
      
      expect(filePath).toContain(taskId);
      expect(filePath).toContain(snapshotType);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(taskId),
        content,
        'utf-8'
      );
    });

    it('should handle large codebase content', async () => {
      const taskId = 'test-large';
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      vi.mocked(fs.writeFile).mockResolvedValueOnce();
      
      await storageManager.storeCodebaseSnapshot(taskId, largeContent, 'pre');
      
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should reject content exceeding size limit', async () => {
      const taskId = 'test-huge';
      const hugeContent = 'x'.repeat(101 * 1024 * 1024); // 101MB
      
      await expect(
        storageManager.storeCodebaseSnapshot(taskId, hugeContent, 'pre')
      ).rejects.toThrow('exceeds maximum size');
    });

    it('should store encrypted content when encryption is enabled', async () => {
      const encryptedConfig = { ...testConfig, encryptTempFiles: true };
      const encryptedManager = new StorageManager(encryptedConfig);
      
      const taskId = 'test-encrypt';
      const content = 'sensitive content';
      
      vi.mocked(fs.writeFile).mockResolvedValueOnce();
      
      await encryptedManager.storeCodebaseSnapshot(taskId, content, 'pre');
      
      // Should write encrypted content, not the original
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.stringContaining(content),
        'utf-8'
      );
    });
  });

  describe('Retrieving Snapshots', () => {
    it('should retrieve stored snapshot content', async () => {
      const taskId = 'test-123';
      const content = 'stored content';
      const snapshotType = 'pre';
      
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true as never);
      vi.mocked(fs.readFile).mockResolvedValueOnce(content as never);
      
      const retrieved = await storageManager.getCodebaseSnapshot(taskId, snapshotType);
      
      expect(retrieved).toBe(content);
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(taskId),
        'utf-8'
      );
    });

    it('should return null for non-existent snapshot', async () => {
      const taskId = 'non-existent';
      
      vi.mocked(fs.pathExists).mockResolvedValueOnce(false as never);
      
      const retrieved = await storageManager.getCodebaseSnapshot(taskId, 'pre');
      
      expect(retrieved).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should decrypt content when encryption is enabled', async () => {
      const encryptedConfig = { ...testConfig, encryptTempFiles: true };
      const encryptedManager = new StorageManager(encryptedConfig);
      
      const taskId = 'test-decrypt';
      const originalContent = 'sensitive content';
      
      // Simulate encrypted content stored
      const encryptedContent = encryptedManager['encrypt'](originalContent);
      
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true as never);
      vi.mocked(fs.readFile).mockResolvedValueOnce(encryptedContent as never);
      
      const retrieved = await encryptedManager.getCodebaseSnapshot(taskId, 'pre');
      
      expect(retrieved).toBe(originalContent);
    });
  });

  describe('Task Context Management', () => {
    it('should store task context with metadata', async () => {
      const context = {
        taskId: 'test-123',
        plan: 'Implementation plan',
        preSnapshot: 'snapshot-path-pre',
        postSnapshot: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      vi.mocked(fs.writeFile).mockResolvedValueOnce();
      
      await storageManager.storeTaskContext(context);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-123'),
        expect.stringContaining('Implementation plan'),
        'utf-8'
      );
    });

    it('should retrieve task context', async () => {
      const taskId = 'test-123';
      const context = {
        taskId,
        plan: 'Implementation plan',
        preSnapshot: 'snapshot-path',
        postSnapshot: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true as never);
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(context) as never);
      
      const retrieved = await storageManager.getTaskContext(taskId);
      
      expect(retrieved).toMatchObject({
        taskId,
        plan: 'Implementation plan'
      });
    });
  });

  describe('Cleanup Operations', () => {
    it('should remove old snapshots based on age', async () => {
      const now = Date.now();
      const oldFile = 'task-old-pre-snapshot.txt';
      const newFile = 'task-new-pre-snapshot.txt';
      
      vi.mocked(fs.readdir).mockResolvedValueOnce([oldFile, newFile] as any);
      vi.mocked(fs.stat).mockImplementation(async (filePath) => {
        const pathStr = String(filePath);
        if (pathStr.includes('old')) {
          return { mtime: new Date(now - 25 * 60 * 60 * 1000) } as any; // 25 hours old
        }
        return { mtime: new Date(now - 1 * 60 * 60 * 1000) } as any; // 1 hour old
      });
      
      vi.mocked(fs.unlink).mockResolvedValue();
      
      await storageManager.cleanupOldSnapshots();
      
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining(oldFile));
      expect(fs.unlink).not.toHaveBeenCalledWith(expect.stringContaining(newFile));
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('Read error'));
      
      // Should not throw
      await expect(storageManager.cleanupOldSnapshots()).resolves.not.toThrow();
    });

    it('should remove all snapshots for a task', async () => {
      const taskId = 'test-cleanup';
      
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        `${taskId}-pre-snapshot.txt`,
        `${taskId}-post-snapshot.txt`,
        `${taskId}-context.json`,
        'other-task-snapshot.txt'
      ] as any);
      
      vi.mocked(fs.unlink).mockResolvedValue();
      
      await storageManager.cleanupTaskFiles(taskId);
      
      expect(fs.unlink).toHaveBeenCalledTimes(3);
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining(taskId));
      expect(fs.unlink).not.toHaveBeenCalledWith(expect.stringContaining('other-task'));
    });
  });

  describe('File Size Management', () => {
    it('should get storage usage statistics', async () => {
      const files = ['file1.txt', 'file2.txt'];
      
      vi.mocked(fs.readdir).mockResolvedValueOnce(files as any);
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 * 1024 } as any); // 1MB each
      
      const stats = await storageManager.getStorageStats();
      
      expect(stats).toEqual({
        totalFiles: 2,
        totalSizeBytes: 2 * 1024 * 1024,
        totalSizeMB: 2
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle file write errors', async () => {
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('Disk full'));
      
      await expect(
        storageManager.storeCodebaseSnapshot('test', 'content', 'pre')
      ).rejects.toThrow('Disk full');
    });

    it('should handle file read errors', async () => {
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true as never);
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Read permission denied'));
      
      await expect(
        storageManager.getCodebaseSnapshot('test', 'pre')
      ).rejects.toThrow('Read permission denied');
    });
  });

  describe('Path Generation', () => {
    it('should generate consistent file paths', () => {
      const taskId = 'test-123';
      const snapshotType = 'pre';
      
      const path1 = storageManager['getSnapshotPath'](taskId, snapshotType);
      const path2 = storageManager['getSnapshotPath'](taskId, snapshotType);
      
      expect(path1).toBe(path2);
      expect(path1).toContain(taskId);
      expect(path1).toContain(snapshotType);
    });

    it('should sanitize task IDs in file paths', () => {
      const unsafeTaskId = '../../../etc/passwd';
      const snapshotType = 'pre';
      
      const safePath = storageManager['getSnapshotPath'](unsafeTaskId, snapshotType);
      
      expect(safePath).not.toContain('..');
      expect(safePath).toContain('etc-passwd');
    });
  });
}); 