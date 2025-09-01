const ENV = import.meta.env.MODE || "development";

interface Config {
  apiUrl: string;
  apiVersion: string;
  env: string;
}

const configs: Record<string, Config> = {
  development: {
    apiUrl: "http://localhost:3000",
    apiVersion: "v1",
    env: "development",
  },
  production: {
    // This should be updated with your actual production API URL
    apiUrl: "https://api.yourapp.com",
    apiVersion: "v1",
    env: "",
  },
  // You can add more environments like staging if needed
};

if (!configs[ENV]) {
  throw new Error(`No config found for environment: ${ENV}`);
}

export const config = {
  ...configs[ENV],
  get baseApiUrl() {
    return `${this.apiUrl}/api/${this.apiVersion}/${this.env}`;
  },
};
