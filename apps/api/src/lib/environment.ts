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
    this.setEnvironment(process.env.NODE_ENV ?? Environments.DEV);
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

  private resolveEnvPath(key: CommonEnvKeys): string {
    // On priority bar, .env.[NODE_ENV] has higher priority than default env file (.env)
    // If both are not resolved, error is thrown.
    const rootDir: string = path.resolve(__dirname, '../../');
    const envPath = path.resolve(rootDir, EnvironmentFile[key]);
    const defaultEnvPath = path.resolve(rootDir, EnvironmentFile.DEFAULT);
    if (!fs.existsSync(envPath) && !fs.existsSync(defaultEnvPath)) {
      throw new Error(envFileNotFoundError(key));
    }
    return fs.existsSync(envPath) ? envPath : defaultEnvPath;
  }

  private validateEnvValues() {
    const env = cleanEnv(process.env, envValidationConfig);
    this.port = env.PORT;
    this.appUrl = env.APP_BASE_URL;

    // Build complete configuration
    this._config = {
      port: env.PORT,
      appUrl: env.APP_BASE_URL,
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

  public setEnvironment(env = Environments.DEV): void {
    this.env = env;

    const envKey = Object.keys(Environments).find(
      (key) => Environments[key] === this.env
    ) as keyof typeof Environments;
    const envPath = this.resolveEnvPath(envKey);

    configDotenv({ path: envPath });
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
