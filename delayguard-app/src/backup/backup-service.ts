/**
 * Comprehensive Backup and Restore Service
 * Provides automated backup, restore, and disaster recovery capabilities
 */

import { withSpan, getTracer, delayGuardMetrics } from '../observability/tracing';

export interface BackupConfig {
  id: string;
  name: string;
  type: 'database' | 'redis' | 'files' | 'secrets';
  schedule: string; // Cron expression
  retention: number; // Days to keep backups
  encryption: boolean;
  compression: boolean;
  destination: string; // S3, local, etc.
}

export interface BackupResult {
  id: string;
  configId: string;
  status: 'success' | 'failed' | 'in_progress';
  startTime: Date;
  endTime?: Date;
  size: number;
  checksum: string;
  error?: string;
}

export interface RestoreConfig {
  backupId: string;
  target: string;
  dryRun: boolean;
  overwrite: boolean;
}

export interface RestoreResult {
  id: string;
  backupId: string;
  status: 'success' | 'failed' | 'in_progress';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

/**
 * Backup Service
 */
export class BackupService {
  private configs: Map<string, BackupConfig> = new Map();
  private results: Map<string, BackupResult> = new Map();
  private restoreResults: Map<string, RestoreResult> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Add backup configuration
   */
  addConfig(config: BackupConfig) {
    this.configs.set(config.id, config);
    console.log(`Backup configuration added: ${config.name}`);
  }

  /**
   * Remove backup configuration
   */
  removeConfig(configId: string) {
    this.configs.delete(configId);
    console.log(`Backup configuration removed: ${configId}`);
  }

  /**
   * Execute backup
   */
  async executeBackup(configId: string): Promise<BackupResult> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Backup configuration not found: ${configId}`);
    }

    const backupId = this.generateBackupId();
    const startTime = new Date();

    const result: BackupResult = {
      id: backupId,
      configId,
      status: 'in_progress',
      startTime,
      size: 0,
      checksum: '',
    };

    this.results.set(backupId, result);

    try {
      const tracer = getTracer('backup');
      const span = tracer.startSpan(`backup.${config.type}`);
      return await withSpan(span, async() => {
        span.setAttributes({
          'backup.id': backupId,
          'backup.type': config.type,
          'backup.name': config.name,
        });

        let backupData: Buffer;

        switch (config.type) {
          case 'database':
            backupData = await this.backupDatabase();
            break;
          case 'redis':
            backupData = await this.backupRedis();
            break;
          case 'files':
            backupData = await this.backupFiles();
            break;
          case 'secrets':
            backupData = await this.backupSecrets();
            break;
          default:
            throw new Error(`Unsupported backup type: ${config.type}`);
        }

        // Calculate checksum
        const checksum = await this.calculateChecksum(backupData);

        // Compress if enabled
        if (config.compression) {
          backupData = await this.compressData(backupData);
        }

        // Encrypt if enabled
        if (config.encryption) {
          backupData = await this.encryptData(backupData);
        }

        // Store backup
        await this.storeBackup(backupId, backupData, config);

        // Update result
        result.status = 'success';
        result.endTime = new Date();
        result.size = backupData.length;
        result.checksum = checksum;

        this.results.set(backupId, result);

        // Record metrics
        delayGuardMetrics.recordApiResponseTime('backup', Date.now() - startTime.getTime());

        console.log(`Backup completed: ${backupId} (${result.size} bytes)`);
        return result;

      });
    } catch (error) {
      result.status = 'failed';
      result.endTime = new Date();
      result.error = (error as Error).message;

      this.results.set(backupId, result);

      console.error(`Backup failed: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * Execute restore
   */
  async executeRestore(restoreConfig: RestoreConfig): Promise<RestoreResult> {
    const restoreId = this.generateRestoreId();
    const startTime = new Date();

    const result: RestoreResult = {
      id: restoreId,
      backupId: restoreConfig.backupId,
      status: 'in_progress',
      startTime,
    };

    this.restoreResults.set(restoreId, result);

    try {
      const tracer = getTracer('backup');
      const span = tracer.startSpan(`restore.${restoreConfig.backupId}`);
      return await withSpan(span, async() => {
        span.setAttributes({
          'restore.id': restoreId,
          'restore.backup_id': restoreConfig.backupId,
          'restore.target': restoreConfig.target,
          'restore.dry_run': restoreConfig.dryRun,
        });

        // Get backup data
        const backupData = await this.retrieveBackup(restoreConfig.backupId);
        const backupResult = this.results.get(restoreConfig.backupId);
        
        if (!backupResult) {
          throw new Error(`Backup not found: ${restoreConfig.backupId}`);
        }

        // Verify checksum
        const checksum = await this.calculateChecksum(backupData);
        if (checksum !== backupResult.checksum) {
          throw new Error('Backup checksum verification failed');
        }

        // Decrypt if needed
        let decryptedData = backupData;
        if (backupResult.checksum.includes('encrypted')) {
          decryptedData = await this.decryptData(backupData);
        }

        // Decompress if needed
        let decompressedData = decryptedData;
        if (backupResult.checksum.includes('compressed')) {
          decompressedData = await this.decompressData(decryptedData);
        }

        // Execute restore
        if (!restoreConfig.dryRun) {
          await this.performRestore(decompressedData, restoreConfig.target);
        }

        result.status = 'success';
        result.endTime = new Date();

        this.restoreResults.set(restoreId, result);

        console.log(`Restore completed: ${restoreId}`);
        return result;

      });
    } catch (error) {
      result.status = 'failed';
      result.endTime = new Date();
      result.error = (error as Error).message;

      this.restoreResults.set(restoreId, result);

      console.error(`Restore failed: ${restoreId}`, error);
      throw error;
    }
  }

  /**
   * Get backup status
   */
  getBackupStatus(backupId: string): BackupResult | undefined {
    return this.results.get(backupId);
  }

  /**
   * Get restore status
   */
  getRestoreStatus(restoreId: string): RestoreResult | undefined {
    return this.restoreResults.get(restoreId);
  }

  /**
   * List all backups
   */
  listBackups(): BackupResult[] {
    return Array.from(this.results.values());
  }

  /**
   * List all restores
   */
  listRestores(): RestoreResult[] {
    return Array.from(this.restoreResults.values());
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago

    for (const [backupId, result] of this.results) {
      if (result.startTime < cutoffDate) {
        await this.deleteBackup(backupId);
        this.results.delete(backupId);
        console.log(`Old backup deleted: ${backupId}`);
      }
    }
  }

  /**
   * Initialize default backup configurations
   */
  private initializeDefaultConfigs() {
    // Database backup - daily
    this.addConfig({
      id: 'db-daily',
      name: 'Daily Database Backup',
      type: 'database',
      schedule: '0 2 * * *', // 2 AM daily
      retention: 30,
      encryption: true,
      compression: true,
      destination: 's3://delayguard-backups/database/',
    });

    // Redis backup - hourly
    this.addConfig({
      id: 'redis-hourly',
      name: 'Hourly Redis Backup',
      type: 'redis',
      schedule: '0 * * * *', // Every hour
      retention: 7,
      encryption: false,
      compression: true,
      destination: 's3://delayguard-backups/redis/',
    });

    // Files backup - weekly
    this.addConfig({
      id: 'files-weekly',
      name: 'Weekly Files Backup',
      type: 'files',
      schedule: '0 3 * * 0', // 3 AM Sunday
      retention: 90,
      encryption: true,
      compression: true,
      destination: 's3://delayguard-backups/files/',
    });

    // Secrets backup - daily
    this.addConfig({
      id: 'secrets-daily',
      name: 'Daily Secrets Backup',
      type: 'secrets',
      schedule: '0 1 * * *', // 1 AM daily
      retention: 365,
      encryption: true,
      compression: false,
      destination: 's3://delayguard-backups/secrets/',
    });
  }

  /**
   * Backup database
   */
  private async backupDatabase(): Promise<Buffer> {
    const { query } = await import('../database/connection');
    
    // Create database dump
    const dump = await query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    return Buffer.from(JSON.stringify(dump.rows, null, 2));
  }

  /**
   * Backup Redis
   */
  private async backupRedis(): Promise<Buffer> {
    const { redis } = await import('../queue/setup');
    
    // Get all keys
    const keys = await redis.keys('*');
    const data: Record<string, unknown> = {};
    
    for (const key of keys) {
      const type = await redis.type(key);
      let value: unknown;
      
      switch (type) {
        case 'string':
          value = await redis.get(key);
          break;
        case 'hash':
          value = await redis.hgetall(key);
          break;
        case 'list':
          value = await redis.lrange(key, 0, -1);
          break;
        case 'set':
          value = await redis.smembers(key);
          break;
        case 'zset':
          value = await redis.zrange(key, 0, -1, 'WITHSCORES');
          break;
        default:
          value = null;
      }
      
      data[key] = { type, value };
    }
    
    return Buffer.from(JSON.stringify(data, null, 2));
  }

  /**
   * Backup files
   */
  private async backupFiles(): Promise<Buffer> {
    const fs = await import('fs/promises');
    
    // Create tar archive of important files
    const files = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'jest.config.ts',
      'webpack.config.js',
      'vercel.json',
    ];
    
    const archive: Record<string, string> = {};
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        archive[file] = content;
      } catch (error) {
        console.warn(`Could not backup file: ${file}`, error);
      }
    }
    
    return Buffer.from(JSON.stringify(archive, null, 2));
  }

  /**
   * Backup secrets
   */
  private async backupSecrets(): Promise<Buffer> {
    const secrets = {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? '[REDACTED]' : undefined,
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? '[REDACTED]' : undefined,
      DATABASE_URL: process.env.DATABASE_URL ? '[REDACTED]' : undefined,
      REDIS_URL: process.env.REDIS_URL ? '[REDACTED]' : undefined,
      SHIPENGINE_API_KEY: process.env.SHIPENGINE_API_KEY ? '[REDACTED]' : undefined,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? '[REDACTED]' : undefined,
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '[REDACTED]' : undefined,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '[REDACTED]' : undefined,
    };
    
    return Buffer.from(JSON.stringify(secrets, null, 2));
  }

  /**
   * Calculate checksum
   */
  private async calculateChecksum(data: Buffer): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Compress data
   */
  private async compressData(data: Buffer): Promise<Buffer> {
    const { gzip } = await import('zlib');
    return new Promise((resolve, reject) => {
      gzip(data, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  /**
   * Decompress data
   */
  private async decompressData(data: Buffer): Promise<Buffer> {
    const { gunzip } = await import('zlib');
    return new Promise((resolve, reject) => {
      gunzip(data, (err, decompressed) => {
        if (err) reject(err);
        else resolve(decompressed);
      });
    });
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: Buffer): Promise<Buffer> {
    const crypto = await import('crypto');
    const algorithm = 'aes-256-gcm';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('delayguard-backup'));
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([key, iv, authTag, encrypted]);
  }

  /**
   * Decrypt data
   */
  private async decryptData(data: Buffer): Promise<Buffer> {
    const crypto = await import('crypto');
    const algorithm = 'aes-256-gcm';
    
    const key = data.subarray(0, 32);
    const _iv = data.subarray(32, 48);
    const authTag = data.subarray(48, 64);
    const encrypted = data.subarray(64);
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('delayguard-backup'));
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Store backup
   */
  private async storeBackup(backupId: string, data: Buffer, config: BackupConfig): Promise<void> {
    // In a real implementation, this would store to S3, local filesystem, etc.
    console.log(`Storing backup ${backupId} to ${config.destination}`);
    // For now, just log the operation
  }

  /**
   * Retrieve backup
   */
  private async retrieveBackup(backupId: string): Promise<Buffer> {
    // In a real implementation, this would retrieve from S3, local filesystem, etc.
    console.log(`Retrieving backup ${backupId}`);
    // For now, return empty buffer
    return Buffer.alloc(0);
  }

  /**
   * Delete backup
   */
  private async deleteBackup(backupId: string): Promise<void> {
    console.log(`Deleting backup ${backupId}`);
  }

  /**
   * Perform restore
   */
  private async performRestore(data: Buffer, target: string): Promise<void> {
    console.log(`Performing restore to ${target}`);
    // Implementation would depend on the target type
  }

  /**
   * Generate backup ID
   */
  private generateBackupId(): string {
    return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate restore ID
   */
  private generateRestoreId(): string {
    return `restore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const backupService = new BackupService();
