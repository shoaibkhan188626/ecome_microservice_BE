// packages/common/tests/config/base-config.test.js

import Joi from 'joi';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { BaseConfig } from '../../src/config/base-config.js';

describe('BaseConfig', () => {
  let originalEnv;

  beforeEach(() => {
    // Backup original env
    originalEnv = { ...process.env };

    // Set minimum required vars
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.SERVICE_NAME = 'test-service';
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should validate required environment variables', () => {
    const config = new BaseConfig();
    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(3000);
    expect(config.serviceName).toBe('test-service');
  });

  it('should throw error for missing required variables', () => {
    delete process.env.SERVICE_NAME;

    expect(() => new BaseConfig()).toThrow(/Missing required.*SERVICE_NAME/);
  });

  it('should validate node environment', () => {
    process.env.NODE_ENV = 'invalid';

    expect(() => new BaseConfig()).toThrow(/"nodeEnv" must be one of/);
  });

  it('should validate port number', () => {
    process.env.PORT = '999999';

    expect(() => new BaseConfig()).toThrow(/"port" must be a valid port number/);
  });

  it('should provide environment helper methods', () => {
    process.env.NODE_ENV = 'development';
    const devConfig = new BaseConfig();
    expect(devConfig.isDevelopment).toBe(true);
    expect(devConfig.isProduction).toBe(false);

    process.env.NODE_ENV = 'production';
    const prodConfig = new BaseConfig();
    expect(prodConfig.isDevelopment).toBe(false);
    expect(prodConfig.isProduction).toBe(true);
  });

  it('should allow extending with additional env vars', () => {
    class TestConfig extends BaseConfig {
      getAdditionalEnvVars() {
        return {
          customVar: process.env.CUSTOM_VAR,
        };
      }

      getConfigSchema() {
        return super.getConfigSchema().keys({
          customVar: Joi.string().required(),
        });
      }
    }

    process.env.CUSTOM_VAR = 'test-value';
    const config = new TestConfig();
    expect(config.all.customVar).toBe('test-value');
  });

  it('should freeze config object', () => {
    const config = new BaseConfig();
    expect(() => {
      config.all.nodeEnv = 'production';
    }).toThrow(); // Object is frozen
  });
});
