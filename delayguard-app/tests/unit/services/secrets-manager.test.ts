import { 
  SecretsManager, 
  SecretType, 
  RotationStrategy, 
  SecretsManagerFactory, 
  SecretUtils 
} from '../../../src/services/secrets-manager';

describe('Secrets Manager', () => {
  let secretsManager: SecretsManager;

  beforeEach(() => {
    secretsManager = new SecretsManager({
      encryptionKey: 'test-encryption-key-32-chars',
      environment: 'test',
      enableAuditLogging: true,
      enableRotation: true,
      defaultRotationDays: 30,
      maxSecretVersions: 5,
      enableAccessControl: false
    });
  });

  describe('Secret Storage and Retrieval', () => {
    it('should store and retrieve secrets', async () => {
      const secretId = await secretsManager.storeSecret(
        'test-api-key',
        'sk_test_123456789',
        SecretType.API_KEY,
        {
          description: 'Test API key',
          tags: ['test', 'api'],
          createdBy: 'test-user'
        }
      );

      expect(secretId).toBeDefined();
      expect(secretId).toMatch(/^secret_\d+_[a-f0-9]+$/);

      const retrievedValue = await secretsManager.getSecret(secretId);
      expect(retrievedValue).toBe('sk_test_123456789');
    });

    it('should encrypt stored secrets', async () => {
      const secretId = await secretsManager.storeSecret(
        'encrypted-secret',
        'sensitive-data',
        SecretType.CUSTOM
      );

      const secret = secretsManager['secrets'].get(secretId);
      expect(secret).toBeDefined();
      expect(secret!.value).toBe('sensitive-data');
      expect(secret!.encryptedValue).not.toBe('sensitive-data');
      expect(secret!.encryptedValue).toContain(':');
    });

    it('should return null for non-existent secrets', async () => {
      const result = await secretsManager.getSecret('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return null for inactive secrets', async () => {
      const secretId = await secretsManager.storeSecret(
        'inactive-secret',
        'test-value',
        SecretType.CUSTOM
      );

      await secretsManager.deleteSecret(secretId);
      const result = await secretsManager.getSecret(secretId);
      expect(result).toBeNull();
    });
  });

  describe('Secret Metadata', () => {
    it('should store and retrieve secret metadata', async () => {
      const secretId = await secretsManager.storeSecret(
        'metadata-test',
        'test-value',
        SecretType.JWT_SECRET,
        {
          description: 'JWT signing secret',
          tags: ['jwt', 'auth'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          rotationStrategy: RotationStrategy.AUTOMATIC,
          createdBy: 'admin'
        }
      );

      const metadata = secretsManager.getSecretMetadata(secretId);
      expect(metadata).toBeDefined();
      expect(metadata!.name).toBe('metadata-test');
      expect(metadata!.type).toBe(SecretType.JWT_SECRET);
      expect(metadata!.description).toBe('JWT signing secret');
      expect(metadata!.tags).toEqual(['jwt', 'auth']);
      expect(metadata!.rotationStrategy).toBe(RotationStrategy.AUTOMATIC);
      expect(metadata!.createdBy).toBe('admin');
      expect(metadata!.isActive).toBe(true);
    });

    it('should list all secrets', async () => {
      await secretsManager.storeSecret('secret1', 'value1', SecretType.API_KEY);
      await secretsManager.storeSecret('secret2', 'value2', SecretType.DATABASE_PASSWORD);
      await secretsManager.storeSecret('secret3', 'value3', SecretType.JWT_SECRET);

      const secrets = secretsManager.listSecrets();
      expect(secrets).toHaveLength(3);
      expect(secrets.map(s => s.name)).toContain('secret1');
      expect(secrets.map(s => s.name)).toContain('secret2');
      expect(secrets.map(s => s.name)).toContain('secret3');
    });

    it('should filter secrets by type', async () => {
      await secretsManager.storeSecret('api-key-1', 'key1', SecretType.API_KEY);
      await secretsManager.storeSecret('api-key-2', 'key2', SecretType.API_KEY);
      await secretsManager.storeSecret('db-password', 'pass', SecretType.DATABASE_PASSWORD);

      const apiKeys = secretsManager.getSecretsByType(SecretType.API_KEY);
      expect(apiKeys).toHaveLength(2);
      expect(apiKeys.every(s => s.type === SecretType.API_KEY)).toBe(true);
    });

    it('should filter secrets by tags', async () => {
      await secretsManager.storeSecret('secret1', 'value1', SecretType.API_KEY, {
        tags: ['production', 'api']
      });
      await secretsManager.storeSecret('secret2', 'value2', SecretType.DATABASE_PASSWORD, {
        tags: ['production', 'database']
      });
      await secretsManager.storeSecret('secret3', 'value3', SecretType.JWT_SECRET, {
        tags: ['development', 'auth']
      });

      const productionSecrets = secretsManager.getSecretsByTags(['production']);
      expect(productionSecrets).toHaveLength(2);
      expect(productionSecrets.every(s => s.tags.includes('production'))).toBe(true);
    });
  });

  describe('Secret Updates', () => {
    it('should update secret values', async () => {
      const secretId = await secretsManager.storeSecret(
        'updatable-secret',
        'original-value',
        SecretType.CUSTOM
      );

      const success = await secretsManager.updateSecret(secretId, 'updated-value', 'test-user');
      expect(success).toBe(true);

      const updatedValue = await secretsManager.getSecret(secretId);
      expect(updatedValue).toBe('updated-value');

      const metadata = secretsManager.getSecretMetadata(secretId);
      expect(metadata!.version).toBe(2);
    });

    it('should fail to update non-existent secrets', async () => {
      const success = await secretsManager.updateSecret('non-existent', 'new-value');
      expect(success).toBe(false);
    });
  });

  describe('Secret Rotation', () => {
    it('should rotate secrets', async () => {
      const secretId = await secretsManager.storeSecret(
        'rotatable-secret',
        'original-value',
        SecretType.API_KEY,
        { rotationStrategy: RotationStrategy.MANUAL }
      );

      const success = await secretsManager.rotateSecret(secretId, 'rotated-value', 'admin');
      expect(success).toBe(true);

      const rotatedValue = await secretsManager.getSecret(secretId);
      expect(rotatedValue).toBe('rotated-value');

      const metadata = secretsManager.getSecretMetadata(secretId);
      expect(metadata!.lastRotated).toBeDefined();
    });

    it('should identify secrets needing rotation', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      
      const secretId = await secretsManager.storeSecret(
        'expired-secret',
        'value',
        SecretType.API_KEY,
        {
          expiresAt: expiredDate,
          rotationStrategy: RotationStrategy.AUTOMATIC
        }
      );

      const needsRotation = secretsManager.needsRotation(secretId);
      expect(needsRotation).toBe(true);

      const secretsNeedingRotation = secretsManager.getSecretsNeedingRotation();
      expect(secretsNeedingRotation).toContainEqual(
        expect.objectContaining({ id: secretId })
      );
    });
  });

  describe('Secret Deletion', () => {
    it('should soft delete secrets', async () => {
      const secretId = await secretsManager.storeSecret(
        'deletable-secret',
        'value',
        SecretType.CUSTOM
      );

      const success = await secretsManager.deleteSecret(secretId, 'admin');
      expect(success).toBe(true);

      const deletedValue = await secretsManager.getSecret(secretId);
      expect(deletedValue).toBeNull();

      const metadata = secretsManager.getSecretMetadata(secretId);
      expect(metadata!.isActive).toBe(false);
    });

    it('should fail to delete non-existent secrets', async () => {
      const success = await secretsManager.deleteSecret('non-existent', 'admin');
      expect(success).toBe(false);
    });
  });

  describe('Access Logging', () => {
    it('should log secret access', async () => {
      const secretId = await secretsManager.storeSecret(
        'logged-secret',
        'value',
        SecretType.CUSTOM
      );

      await secretsManager.getSecret(secretId, 'test-user');
      await secretsManager.updateSecret(secretId, 'new-value', 'test-user');

      const logs = secretsManager.getAccessLogs(secretId);
      expect(logs).toHaveLength(3); // Store, read, update

      const readLog = logs.find(log => log.action === 'READ');
      expect(readLog).toBeDefined();
      expect(readLog!.success).toBe(true);
      expect(readLog!.accessedBy).toBe('test-user');
    });

    it('should log failed access attempts', async () => {
      await secretsManager.getSecret('non-existent', 'test-user');

      const logs = secretsManager.getAccessLogs();
      const failedLog = logs.find(log => !log.success);
      expect(failedLog).toBeDefined();
      expect(failedLog!.error).toContain('Secret not found');
    });
  });

  describe('Event Emission', () => {
    it('should emit secret stored event', (done) => {
      secretsManager.on('secretStored', (data) => {
        expect(data.secretId).toBeDefined();
        expect(data.name).toBe('event-test');
        expect(data.type).toBe(SecretType.API_KEY);
        done();
      });

      secretsManager.storeSecret('event-test', 'value', SecretType.API_KEY);
    });

    it('should emit secret accessed event', (done) => {
      secretsManager.storeSecret('access-test', 'value', SecretType.CUSTOM)
        .then(secretId => {
          secretsManager.on('secretAccessed', (data) => {
            expect(data.secretId).toBe(secretId);
            expect(data.accessedBy).toBe('test-user');
            done();
          });

          secretsManager.getSecret(secretId, 'test-user');
        });
    });
  });

  describe('Secrets Manager Factory', () => {
    it('should create development manager', () => {
      const manager = SecretsManagerFactory.createDevelopment();
      expect(manager).toBeDefined();
      expect(manager['config'].environment).toBe('development');
      expect(manager['config'].enableAuditLogging).toBe(true);
    });

    it('should create production manager', () => {
      const manager = SecretsManagerFactory.createProduction('production-key');
      expect(manager).toBeDefined();
      expect(manager['config'].environment).toBe('production');
      expect(manager['config'].enableAccessControl).toBe(true);
    });
  });

  describe('Secret Utilities', () => {
    it('should generate secure random secrets', () => {
      const secret = SecretUtils.generateSecret(16);
      expect(secret).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(/^[a-f0-9]+$/.test(secret)).toBe(true);
    });

    it('should generate API keys', () => {
      const apiKey = SecretUtils.generateApiKey();
      expect(apiKey).toMatch(/^sk_[a-f0-9]+$/);
      expect(apiKey).toHaveLength(67); // 'sk_' + 64 hex chars
    });

    it('should generate JWT secrets', () => {
      const jwtSecret = SecretUtils.generateJwtSecret();
      expect(jwtSecret).toBeDefined();
      expect(jwtSecret.length).toBeGreaterThan(50);
    });

    it('should generate database passwords', () => {
      // Test multiple times to account for randomness
      for (let i = 0; i < 10; i++) {
        const password = SecretUtils.generateDatabasePassword();
        expect(password).toHaveLength(16);
        expect(/[A-Z]/.test(password)).toBe(true);
        expect(/[a-z]/.test(password)).toBe(true);
        expect(/[0-9]/.test(password)).toBe(true);
        // Check for at least one special character (more flexible)
        expect(/[!@#$%^&*]/.test(password)).toBe(true);
      }
    });

    it('should validate secret strength', () => {
      const weakSecret = 'password';
      const strongSecret = 'MyStr0ng!P@ssw0rd';

      const weakResult = SecretUtils.validateSecretStrength(weakSecret);
      expect(weakResult.isStrong).toBe(false);
      expect(weakResult.score).toBeLessThan(4);
      expect(weakResult.suggestions.length).toBeGreaterThan(0);

      const strongResult = SecretUtils.validateSecretStrength(strongSecret);
      expect(strongResult.isStrong).toBe(true);
      expect(strongResult.score).toBeGreaterThanOrEqual(4);
      expect(strongResult.suggestions.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      // Create a manager with invalid encryption key that will cause encryption to fail
      const invalidManager = new SecretsManager({
        encryptionKey: 'invalid-key-that-will-cause-encryption-failure',
        environment: 'test',
        enableAuditLogging: false,
        enableRotation: false,
        defaultRotationDays: 30,
        maxSecretVersions: 5,
        enableAccessControl: false
      });

      // Mock the encrypt method to throw an error
      const originalEncrypt = (invalidManager as any).encrypt;
      (invalidManager as any).encrypt = jest.fn().mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      try {
        await invalidManager.storeSecret('test', 'value', SecretType.CUSTOM);
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('Encryption failed');
      }

      // Restore original method
      (invalidManager as any).encrypt = originalEncrypt;
    });

    it('should handle decryption errors', async () => {
      const secretId = await secretsManager.storeSecret('test', 'value', SecretType.CUSTOM);
      
      // Corrupt the encrypted value
      const secret = secretsManager['secrets'].get(secretId);
      if (secret) {
        secret.encryptedValue = 'corrupted:data';
        secretsManager['secrets'].set(secretId, secret);
      }

      const result = await secretsManager.getSecret(secretId);
      expect(result).toBeNull();
    });
  });

  describe('Secret Expiration', () => {
    it('should handle expired secrets', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      
      const secretId = await secretsManager.storeSecret(
        'expired-secret',
        'value',
        SecretType.API_KEY,
        { expiresAt: expiredDate }
      );

      const result = await secretsManager.getSecret(secretId);
      expect(result).toBeNull();
    });

    it('should handle non-expired secrets', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      
      const secretId = await secretsManager.storeSecret(
        'valid-secret',
        'value',
        SecretType.API_KEY,
        { expiresAt: futureDate }
      );

      const result = await secretsManager.getSecret(secretId);
      expect(result).toBe('value');
    });
  });
});
