import { type Environments } from '@/enums/environment.enum';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENVIRONMENT: Environments;
      NODE_ENV: Environments;
      PORT: string;
      API_BASE_URL: string;
      DATABASE_URL: string;
    }
  }
}

export {};
