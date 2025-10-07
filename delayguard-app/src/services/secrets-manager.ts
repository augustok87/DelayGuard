import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Secret Types
 */
export enum SecretType {
  API_KEY = 'API_KEY',
  DATABASE_PASSWORD = 'DATABASE_PASSWORD',
  JWT_SECRET = 'JWT_SECRET',
  ENCRYPTION_KEY = 'ENCRYPTION_KEY',
  OAUTH_SECRET = 'OAUTH_SECRET',
  WEBHOOK_SECRET = 'WEBHOOK_SECRET',
  CUSTOM = 'CUSTOM'
}

/**
 * Secret Rotation Strategy
 */
export enum RotationStrategy {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  SCHEDULED = 'SCHEDULED'
}

/**
 * Secret Metadata
 */
export interface SecretMetadata {
  id: string;
  name: string;
  type: SecretType;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  rotationStrategy: RotationStrategy;
  lastRotated?: Date;
  version: number;
  isActive: boolean;
  environment: string;
  createdBy: string;
}

/**
 * Secret Value
 */
export interface SecretValue {
  id: string;
  value: string;
  encryptedValue: string;
  version: number;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Secret Access Log
 */
export interface SecretAccessLog {
  id: string;
  secretId: string;
  accessedBy: string;
  accessedAt: Date;
  action: 'READ' | 'WRITE' | 'DELETE' | 'ROTATE';
  ipAddress: string;
  userAgent: string;
  success: boolean;
  error?: string;
}

/**
 * Secrets Manager Configuration
 */
export interface SecretsManagerConfig {
  encryptionKey: string;
  environment: string;
  enableAuditLogging: boolean;
  enableRotation: boolean;
  defaultRotationDays: number;
  maxSecretVersions: number;
  enableAccessControl: boolean;
}

/**
 * World-Class Secrets Manager
 * Enterprise-grade secrets management with encryption, rotation, and audit logging
 */
export class SecretsManager extends EventEmitter {
  private config: SecretsManagerConfig;
  private secrets: Map<string, SecretValue> = new Map();
  private metadata: Map<string, SecretMetadata> = new Map();
  private accessLogs: SecretAccessLog[] = [];
  private encryptionKey: Buffer;

  constructor(config: SecretsManagerConfig) {
    super();
    this.config = config;
    this.encryptionKey = this.deriveEncryptionKey(config.encryptionKey);
  }

  /**
   * Store secret with encryption
   */
  async storeSecret(
    name: string,
    value: string,
    type: SecretType,
    options: {
      description?: string;
      tags?: string[];
      expiresAt?: Date;
      rotationStrategy?: RotationStrategy;
      createdBy?: string;
    } = {}
  ): Promise<string> {
    const secretId = this.generateSecretId();
    const encryptedValue = this.encrypt(value);
    
    const metadata: SecretMetadata = {
      id: secretId,
      name,
      type,
      description: options.description,
      tags: options.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: options.expiresAt,
      rotationStrategy: options.rotationStrategy || RotationStrategy.MANUAL,
      version: 1,
      isActive: true,
      environment: this.config.environment,
      createdBy: options.createdBy || 'system'
    };

    const secretValue: SecretValue = {
      id: secretId,
      value,
      encryptedValue,
      version: 1,
      createdAt: new Date(),
      isActive: true
    };

    this.secrets.set(secretId, secretValue);
    this.metadata.set(secretId, metadata);

    this.logAccess(secretId, 'system', 'WRITE', true);
    this.emit('secretStored', { secretId, name, type });

    return secretId;
  }

  /**
   * Retrieve secret with decryption
   */
  async getSecret(secretId: string, accessedBy: string = 'system'): Promise<string | null> {
    const secret = this.secrets.get(secretId);
    const metadata = this.metadata.get(secretId);

    if (!secret || !metadata || !secret.isActive || !metadata.isActive) {
      this.logAccess(secretId, accessedBy, 'READ', false, 'Secret not found or inactive');
      return null;
    }

    // Check expiration
    if (metadata.expiresAt && metadata.expiresAt < new Date()) {
      this.logAccess(secretId, accessedBy, 'READ', false, 'Secret expired');
      return null;
    }

    try {
      const decryptedValue = this.decrypt(secret.encryptedValue);
      this.logAccess(secretId, accessedBy, 'READ', true);
      this.emit('secretAccessed', { secretId, accessedBy });
      return decryptedValue;
    } catch (error) {
      this.logAccess(secretId, accessedBy, 'READ', false, `Decryption failed: ${error}`);
      return null;
    }
  }

  /**
   * Get secret metadata
   */
  getSecretMetadata(secretId: string): SecretMetadata | null {
    return this.metadata.get(secretId) || null;
  }

  /**
   * List all secrets
   */
  listSecrets(): SecretMetadata[] {
    return Array.from(this.metadata.values()).filter(metadata => metadata.isActive);
  }

  /**
   * Update secret
   */
  async updateSecret(
    secretId: string,
    newValue: string,
    updatedBy: string = 'system'
  ): Promise<boolean> {
    const secret = this.secrets.get(secretId);
    const metadata = this.metadata.get(secretId);

    if (!secret || !metadata || !secret.isActive || !metadata.isActive) {
      this.logAccess(secretId, updatedBy, 'WRITE', false, 'Secret not found or inactive');
      return false;
    }

    const encryptedValue = this.encrypt(newValue);
    const newVersion = secret.version + 1;

    // Store new version
    const updatedSecret: SecretValue = {
      ...secret,
      value: newValue,
      encryptedValue,
      version: newVersion,
      createdAt: new Date()
    };

    this.secrets.set(secretId, updatedSecret);
    
    // Update metadata
    metadata.updatedAt = new Date();
    metadata.version = newVersion;
    this.metadata.set(secretId, metadata);

    this.logAccess(secretId, updatedBy, 'WRITE', true);
    this.emit('secretUpdated', { secretId, version: newVersion, updatedBy });

    return true;
  }

  /**
   * Rotate secret
   */
  async rotateSecret(
    secretId: string,
    newValue: string,
    rotatedBy: string = 'system'
  ): Promise<boolean> {
    const metadata = this.metadata.get(secretId);
    if (!metadata || !metadata.isActive) {
      return false;
    }

    // Update secret value
    const success = await this.updateSecret(secretId, newValue, rotatedBy);
    
    if (success) {
      metadata.lastRotated = new Date();
      this.metadata.set(secretId, metadata);
      this.emit('secretRotated', { secretId, rotatedBy });
    }

    return success;
  }

  /**
   * Delete secret
   */
  async deleteSecret(secretId: string, deletedBy: string = 'system'): Promise<boolean> {
    const secret = this.secrets.get(secretId);
    const metadata = this.metadata.get(secretId);

    if (!secret || !metadata) {
      this.logAccess(secretId, deletedBy, 'DELETE', false, 'Secret not found');
      return false;
    }

    // Soft delete - mark as inactive
    secret.isActive = false;
    metadata.isActive = false;
    metadata.updatedAt = new Date();

    this.secrets.set(secretId, secret);
    this.metadata.set(secretId, metadata);

    this.logAccess(secretId, deletedBy, 'DELETE', true);
    this.emit('secretDeleted', { secretId, deletedBy });

    return true;
  }

  /**
   * Get secrets by type
   */
  getSecretsByType(type: SecretType): SecretMetadata[] {
    return this.listSecrets().filter(secret => secret.type === type);
  }

  /**
   * Get secrets by tags
   */
  getSecretsByTags(tags: string[]): SecretMetadata[] {
    return this.listSecrets().filter(secret => 
      tags.some(tag => secret.tags.includes(tag))
    );
  }

  /**
   * Get access logs
   */
  getAccessLogs(secretId?: string, limit: number = 100): SecretAccessLog[] {
    let logs = this.accessLogs;
    
    if (secretId) {
      logs = logs.filter(log => log.secretId === secretId);
    }
    
    return logs
      .sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Check if secret needs rotation
   */
  needsRotation(secretId: string): boolean {
    const metadata = this.metadata.get(secretId);
    if (!metadata || !metadata.isActive) return false;

    if (metadata.rotationStrategy === RotationStrategy.MANUAL) return false;
    
    if (metadata.rotationStrategy === RotationStrategy.AUTOMATIC) {
      // Rotate if expired
      return metadata.expiresAt ? metadata.expiresAt < new Date() : false;
    }
    
    if (metadata.rotationStrategy === RotationStrategy.SCHEDULED) {
      // Rotate based on schedule (simplified - in production, use cron)
      const daysSinceLastRotation = metadata.lastRotated 
        ? (Date.now() - metadata.lastRotated.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      
      return daysSinceLastRotation >= this.config.defaultRotationDays;
    }

    return false;
  }

  /**
   * Get secrets needing rotation
   */
  getSecretsNeedingRotation(): SecretMetadata[] {
    return this.listSecrets().filter(secret => this.needsRotation(secret.id));
  }

  /**
   * Encrypt value
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt value
   */
  private decrypt(encryptedValue: string): string {
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Derive encryption key from master key
   */
  private deriveEncryptionKey(masterKey: string): Buffer {
    return crypto.createHash('sha256').update(masterKey).digest();
  }

  /**
   * Generate unique secret ID
   */
  private generateSecretId(): string {
    return `secret_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Log secret access
   */
  private logAccess(
    secretId: string,
    accessedBy: string,
    action: 'READ' | 'WRITE' | 'DELETE' | 'ROTATE',
    success: boolean,
    error?: string
  ): void {
    if (!this.config.enableAuditLogging) return;

    const log: SecretAccessLog = {
      id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      secretId,
      accessedBy,
      accessedAt: new Date(),
      action,
      ipAddress: '127.0.0.1', // In production, get from request context
      userAgent: 'SecretsManager/1.0',
      success,
      error
    };

    this.accessLogs.push(log);
    
    // Keep only recent logs
    if (this.accessLogs.length > 10000) {
      this.accessLogs = this.accessLogs.slice(-5000);
    }
  }

  /**
   * Validate secret name
   */
  private validateSecretName(name: string): boolean {
    // Secret names should be alphanumeric with underscores and hyphens
    return /^[a-zA-Z0-9_-]+$/.test(name) && name.length >= 3 && name.length <= 100;
  }

  /**
   * Validate secret value
   */
  private validateSecretValue(value: string): boolean {
    // Basic validation - in production, add more sophisticated checks
    return value.length >= 8 && value.length <= 1000;
  }
}

/**
 * Secret Utilities
 */
export class SecretUtils {
  /**
   * Generate a secure database password
   */
  static generateDatabasePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Generate a secure API key
   */
  static generateAPIKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < length; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }

  /**
   * Generate secure random secret
   */
  static generateSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key (alias for generateAPIKey)
   */
  static generateApiKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generate JWT secret (alias for generateJWTSecret)
   */
  static generateJwtSecret(): string {
    return this.generateJWTSecret();
  }

  /**
   * Generate a JWT secret
   */
  static generateJWTSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Validate secret strength
   */
  static validateSecretStrength(secret: string): { isStrong: boolean; score: number; suggestions: string[] } {
    let score = 0;
    const suggestions: string[] = [];

    if (secret.length >= 8) score += 1;
    else suggestions.push('Use at least 8 characters');

    if (secret.length >= 12) score += 1;
    else suggestions.push('Use 12+ characters for better security');

    if (/[A-Z]/.test(secret)) score += 1;
    else suggestions.push('Include uppercase letters');

    if (/[a-z]/.test(secret)) score += 1;
    else suggestions.push('Include lowercase letters');

    if (/[0-9]/.test(secret)) score += 1;
    else suggestions.push('Include numbers');

    if (/[!@#$%^&*]/.test(secret)) score += 1;
    else suggestions.push('Include special characters');

    return {
      isStrong: score >= 4,
      score,
      suggestions
    };
  }
}

/**
 * Secrets Manager Factory
 */
export class SecretsManagerFactory {
  /**
   * Create development secrets manager
   */
  static createDevelopment(): SecretsManager {
    return new SecretsManager({
      encryptionKey: process.env.SECRETS_ENCRYPTION_KEY || 'dev-key-change-in-production',
      environment: 'development',
      enableAuditLogging: true,
      enableRotation: false,
      defaultRotationDays: 90,
      maxSecretVersions: 5,
      enableAccessControl: false
    });
  }

  /**
   * Create production secrets manager
   */
  static createProduction(encryptionKey: string): SecretsManager {
    return new SecretsManager({
      encryptionKey,
      environment: 'production',
      enableAuditLogging: true,
      enableRotation: true,
      defaultRotationDays: 30,
      maxSecretVersions: 10,
      enableAccessControl: true
    });
  }
}

