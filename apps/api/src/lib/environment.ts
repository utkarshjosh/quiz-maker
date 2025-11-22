import fs from 'fs';
import path from 'path';
import { config as configDotenv } from 'dotenv';
import { cleanEnv } from 'envalid';
import { EnvironmentFile, Environments } from '@/enums/environment.enum';
import envValidationConfig from '@/config/env-validation.config';
import { envFileNotFoundError } from '@/utils/helper';
import { type CommonEnvKeys } from '@/types/environment.type';
import appConfig from '@/config/app.config';

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

  constructor() {
    this.port = parseInt(process.env.PORT ?? appConfig.defaultPort.toString());
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

  private resolveEnvPath(key: CommonEnvKeys): string | null {
    // On priority bar, .env.<ENVIRONMENT> has higher priority than default env file (.env)
    // In Docker containers, env vars are passed via process.env, so .env files may not exist
    const rootDir: string = path.resolve(__dirname, '../../');
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
      configDotenv({ path: envPath });
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
