import fs from 'fs';
import path from 'path';
import { config as configDotenv } from 'dotenv';
import { cleanEnv } from 'envalid';
import { EnvironmentFile, Environments } from '@/enums/environment.enum';
import envValidationConfig from '@/config/env-validation.config';
import { envFileNotFoundError } from '@/utils/helper';
import { type CommonEnvKeys } from '@/types/environment.type';

export interface IEnvironment {
  getCurrentEnvironment: () => string;
  setEnvironment: (env?: Environments) => void;
  isProd: () => boolean;
  isDev: () => boolean;
  isTest: () => boolean;
  isStage: () => boolean;
  getConfig: () => EnvironmentConfig;
}

export interface EnvironmentConfig {
  port: number;
  appUrl: string;
  apiBaseUrl: string;
  env: string;
  databaseUrl: string;
  auth0: {
    domain: string;
    clientId: string;
    clientSecret: string;
    audience: string;
  };
  jwt: {
    secret: string;
  };
  frontend: {
    url: string;
  };
}

class Environment implements IEnvironment {
  private _port: number;
  private _env: Environments;
  private _appUrl: string;
  private _config: EnvironmentConfig | null = null;
  private _defaultEnvRoot: string | null = null;

  constructor() {
    // First, load the default .env file to ensure process.env is populated
    // before we try to read ENVIRONMENT or NODE_ENV
    this.loadDefaultEnvFile();

    // Now read the environment from process.env (which may have been loaded from .env file)
    const normalizedEnv = this.normalizeEnvironment(
      process.env.ENVIRONMENT ?? process.env.NODE_ENV ?? Environments.DEV
    );
    process.env.ENVIRONMENT = normalizedEnv;
    process.env.NODE_ENV = normalizedEnv;
    this.setEnvironment(normalizedEnv);
  }

  get env() {
    return this._env;
  }

  set env(value) {
    this._env = value;
  }

  get port() {
    return this._port;
  }

  set port(value) {
    this._port = value;
  }

  get appUrl() {
    return this._appUrl;
  }

  set appUrl(value) {
    this._appUrl = value;
  }

  private loadDefaultEnvFile(): void {
    // Load the default .env file first, before determining environment
    // This ensures process.env is populated when we check ENVIRONMENT/NODE_ENV
    const sourceRootDir = path.resolve(__dirname, '../../');
    const possibleRoots = [
      sourceRootDir, // Default: apps/api
      process.cwd(), // Working directory (could be workspace root or apps/api)
      path.resolve(process.cwd(), 'apps/api'), // Workspace root -> apps/api
    ];

    // Find and load the default .env file
    for (const possibleRoot of possibleRoots) {
      const defaultEnvPath = path.resolve(
        possibleRoot,
        EnvironmentFile.DEFAULT
      );
      if (fs.existsSync(defaultEnvPath)) {
        const result = configDotenv({ path: defaultEnvPath });
        if (result.error) {
          console.warn(
            `Warning: Failed to load default .env file from ${defaultEnvPath}:`,
            result.error.message
          );
        }
        // Store the root directory for later use
        this._defaultEnvRoot = possibleRoot;
        return; // Found and loaded, exit
      }
    }

    // If no .env file found, check if we're in Docker (env vars passed via docker-compose)
    const isDocker =
      process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');
    if (!isDocker) {
      // In local dev without .env file, warn but don't error (will error later if required vars missing)
      console.warn(
        'Warning: No default .env file found. Environment variables must be set in process.env.'
      );
    }
  }

  private resolveEnvPath(key: CommonEnvKeys): string | null {
    // On priority bar, .env.<ENVIRONMENT> has higher priority than default env file (.env)
    // In Docker containers, env vars are passed via process.env, so .env files may not exist

    // Use the stored root directory from loadDefaultEnvFile if available
    let rootDir: string;
    if (this._defaultEnvRoot) {
      rootDir = this._defaultEnvRoot;
    } else {
      // Fallback: resolve root directory - works both from source (src/) and compiled (dist/)
      // __dirname in source: apps/api/src/lib
      // __dirname in compiled: apps/api/dist/lib
      // Going up two levels from either location gets us to apps/api
      const sourceRootDir = path.resolve(__dirname, '../../');

      // Also check from process.cwd() in case we're running from a different directory
      // This handles cases where node dist/index.js is run from workspace root or other locations
      const possibleRoots = [
        sourceRootDir, // Default: apps/api
        process.cwd(), // Working directory (could be workspace root or apps/api)
        path.resolve(process.cwd(), 'apps/api'), // Workspace root -> apps/api
      ];

      // Find the first directory that contains a .env file
      let foundRootDir: string | null = null;
      for (const possibleRoot of possibleRoots) {
        const testPath = path.resolve(possibleRoot, EnvironmentFile.DEFAULT);
        if (fs.existsSync(testPath)) {
          foundRootDir = possibleRoot;
          break;
        }
      }

      // Fallback to sourceRootDir if no .env found (will be checked later)
      rootDir = foundRootDir ?? sourceRootDir;
    }

    const envPath = path.resolve(rootDir, EnvironmentFile[key]);
    const defaultEnvPath = path.resolve(rootDir, EnvironmentFile.DEFAULT);

    // Check if environment-specific .env file exists
    if (fs.existsSync(envPath)) {
      return envPath;
    }

    // Check if default .env file exists
    if (fs.existsSync(defaultEnvPath)) {
      return defaultEnvPath;
    }

    // No .env file found - check if all required env vars are already in process.env
    // This is the case for Docker containers where env vars are passed via docker-compose
    const missingRequiredEnvKeys = Object.keys(envValidationConfig).filter(
      (envVarKey) => process.env[envVarKey] === undefined
    );

    // If all required vars are in process.env, we don't need a .env file (Docker scenario)
    if (missingRequiredEnvKeys.length === 0) {
      return null; // Return null to skip dotenv loading, use process.env directly
    }

    // If we're here, no .env file exists AND required vars are missing
    // This is an error condition (local development without proper setup)
    // In Docker, ensure all required env vars are passed via docker-compose env_file or environment
    const isDocker =
      process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');
    const errorMsg = isDocker
      ? `Missing required environment variables in Docker container: ${missingRequiredEnvKeys.join(', ')}. Ensure docker-compose env_file contains all required variables.`
      : envFileNotFoundError(key);
    throw new Error(errorMsg);
  }

  private validateEnvValues() {
    const env = cleanEnv(process.env, envValidationConfig);
    this.port = env.PORT;
    this.appUrl = 'http://localhost';

    // Build complete configuration
    this._config = {
      port: env.PORT,
      appUrl: this.appUrl,
      apiBaseUrl: env.API_BASE_URL,
      env: this._env,
      databaseUrl: env.DATABASE_URL,
      auth0: {
        domain: env.AUTH0_DOMAIN,
        clientId: env.AUTH0_CLIENT_ID,
        clientSecret: env.AUTH0_CLIENT_SECRET,
        audience: env.AUTH0_AUDIENCE,
      },
      jwt: {
        secret: env.JWT_SECRET,
      },
      frontend: {
        url: env.FRONTEND_URL,
      },
    };
  }

  private normalizeEnvironment(value?: string): Environments {
    if (!value) {
      return Environments.DEV;
    }
    const normalized = value.toLowerCase();
    const match = Object.values(Environments).find(
      (environment) => environment === normalized
    );
    return (match as Environments) ?? Environments.DEV;
  }

  public setEnvironment(env = Environments.DEV): void {
    const normalizedEnv = this.normalizeEnvironment(env);
    this.env = normalizedEnv;
    process.env.ENVIRONMENT = normalizedEnv;
    process.env.NODE_ENV = normalizedEnv;

    const envKey = Object.keys(Environments).find(
      (key) => Environments[key] === this.env
    ) as keyof typeof Environments;
    const envPath = this.resolveEnvPath(envKey);

    if (envPath) {
      // Only load if it's an environment-specific file (not the default .env which was already loaded)
      const isDefaultEnvFile = envPath.endsWith(EnvironmentFile.DEFAULT);
      if (!isDefaultEnvFile) {
        // Load environment-specific file (e.g., .env.prod) - this will override defaults
        const result = configDotenv({ path: envPath });
        if (result.error) {
          console.error(
            `Failed to load .env file from ${envPath}:`,
            result.error
          );
          throw result.error;
        }
        // Debug logging in development to verify env file is loaded
        if (this.isDev()) {
          console.log(
            `✓ Loaded environment-specific .env file from: ${envPath}`
          );
        }
      } else if (this.isDev()) {
        // Default .env file was already loaded in constructor
        console.log(`✓ Using default .env file from: ${envPath}`);
      }
    }
    this.validateEnvValues();
  }

  public getCurrentEnvironment() {
    return this.env;
  }

  public isProd() {
    return this.env === Environments.PRODUCTION;
  }

  public isDev() {
    return this.env === Environments.DEV;
  }

  public isStage() {
    return this.env === Environments.STAGING;
  }

  public isTest() {
    return this.env === Environments.TEST;
  }

  public getConfig(): EnvironmentConfig {
    if (!this._config) {
      throw new Error(
        'Environment configuration not initialized. Call setEnvironment() first.'
      );
    }
    return this._config;
  }
}

export { Environment };
export default new Environment();
