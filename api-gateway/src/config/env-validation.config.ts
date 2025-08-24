import { str, num } from 'envalid';
import appConfig from './app.config';
import { Environments } from '@/enums/environment.enum';

const envValidationConfig = {
  NODE_ENV: str({
    default: Environments.DEV,
    choices: [...Object.values(Environments)],
  }),
  PORT: num({ default: appConfig.defaultPort }),
  APP_BASE_URL: str(),
  DATABASE_URL: str(),
  AUTH0_DOMAIN: str(),
  AUTH0_CLIENT_ID: str(),
  AUTH0_CLIENT_SECRET: str(),
  AUTH0_AUDIENCE: str(),
  JWT_SECRET: str(),
  FRONTEND_URL: str(),
};

export default envValidationConfig;
