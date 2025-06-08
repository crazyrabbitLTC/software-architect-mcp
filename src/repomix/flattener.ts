import { execa } from 'execa';
import { logger } from '../utils/logger.js';
import fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class CodeFlattener {
  private getTmpDir(): string {
    return path.join(os.tmpdir(), 'software-architect-mcp', 'repomix');
  }

  /**
   * Flattens a codebase using Repomix
   * @param codebasePath Path to the codebase to flatten
   * @param outputPath Optional path to save the flattened output. If not provided, returns the output directly
   * @returns The flattened codebase as a string, or void if outputPath is provided
   */
  async flattenCodebase(codebasePath: string, outputPath?: string): Promise<string | void> {
    try {
      logger.info(`Flattening codebase at ${codebasePath}`);

      // Create tmp directory for repomix operations
      const tmpDir = this.getTmpDir();
      await fs.ensureDir(tmpDir);

      // Create unique output file in tmp directory
      const tmpOutputFile = path.join(tmpDir, `repomix-${Date.now()}.txt`);

      // Run repomix with output flag to avoid permission issues
      await execa('npx', ['repomix',
        '--style', 'plain',
        '--output', tmpOutputFile,
        path.resolve(codebasePath)
      ]);

      // Read the flattened content
      const content = await fs.readFile(tmpOutputFile, 'utf8');

      // Clean up the temporary file
      await fs.remove(tmpOutputFile);

      if (outputPath) {
        // Ensure output directory exists
        await fs.ensureDir(path.dirname(outputPath));
        // Write flattened output to file
        await fs.writeFile(outputPath, content, 'utf8');
        logger.info(`Flattened codebase written to ${outputPath}`);
      } else {
        return content;
      }
    } catch (error) {
      logger.error('Error flattening codebase:', error);
      throw new Error(`Failed to flatten codebase: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Flattens specific files using Repomix
   * @param files Array of file paths to flatten
   * @param outputPath Optional path to save the flattened output
   * @returns The flattened code as a string, or void if outputPath is provided
   */
  async flattenFiles(files: string[], outputPath?: string): Promise<string | void> {
    try {
      logger.info(`Flattening ${files.length} files`);

      // Create temporary directories
      const tmpDir = this.getTmpDir();
      await fs.ensureDir(tmpDir);
      
      const filesDir = path.join(tmpDir, `files-${Date.now()}`);
      await fs.ensureDir(filesDir);

      // Copy files to temp directory maintaining relative paths
      for (const file of files) {
        const targetPath = path.join(filesDir, path.basename(file));
        await fs.copy(file, targetPath);
      }

      // Create output file in tmp directory
      const tmpOutputFile = path.join(tmpDir, `repomix-files-${Date.now()}.txt`);

      // Run repomix on temp directory
      await execa('npx', ['repomix',
        '--style', 'plain',
        '--output', tmpOutputFile,
        filesDir
      ]);

      // Read the flattened content
      const content = await fs.readFile(tmpOutputFile, 'utf8');

      // Clean up temp directories and files
      await fs.remove(filesDir);
      await fs.remove(tmpOutputFile);

      if (outputPath) {
        await fs.writeFile(outputPath, content, 'utf8');
        logger.info(`Flattened files written to ${outputPath}`);
      } else {
        return content;
      }
    } catch (error) {
      logger.error('Error flattening files:', error);
      throw new Error(`Failed to flatten files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a diff between two codebases using Repomix
   * @param beforePath Path to the codebase before changes
   * @param afterPath Path to the codebase after changes
   * @param outputPath Optional path to save the diff output
   * @returns The diff as a string, or void if outputPath is provided
   */
  async getDiff(beforePath: string, afterPath: string, outputPath?: string): Promise<string | void> {
    try {
      logger.info(`Getting diff between ${beforePath} and ${afterPath}`);

      // Flatten both codebases
      const beforeFlat = await this.flattenCodebase(beforePath);
      const afterFlat = await this.flattenCodebase(afterPath);

      if (!beforeFlat || !afterFlat) {
        throw new Error('Failed to flatten codebases for diff');
      }

      // Create temporary files for diff in tmp directory
      const tmpDir = this.getTmpDir();
      await fs.ensureDir(tmpDir);
      
      const tempBefore = path.join(tmpDir, `before-${Date.now()}.txt`);
      const tempAfter = path.join(tmpDir, `after-${Date.now()}.txt`);

      await fs.writeFile(tempBefore, beforeFlat);
      await fs.writeFile(tempAfter, afterFlat);

      // Generate diff
      const { stdout } = await execa('diff', ['-u', tempBefore, tempAfter]);

      // Clean up temp files
      await fs.remove(tempBefore);
      await fs.remove(tempAfter);

      if (outputPath) {
        await fs.writeFile(outputPath, stdout, 'utf8');
        logger.info(`Diff written to ${outputPath}`);
      } else {
        return stdout;
      }
    } catch (error) {
      logger.error('Error generating diff:', error);
      throw new Error(`Failed to generate diff: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 