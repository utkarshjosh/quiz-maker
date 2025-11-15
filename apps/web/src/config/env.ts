const apiUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const apiVersion = import.meta.env.VITE_API_VERSION ?? "v1";
const apiEnvironment =
  import.meta.env.VITE_API_ENV ?? import.meta.env.MODE ?? "development";
const socketUrl = import.meta.env.VITE_SOCKET_URL ?? "ws://localhost:5000/ws";

export const config = {
  apiUrl,
  apiVersion,
  env: apiEnvironment,
  socketUrl,
  get baseApiUrl() {
    const envSegment = this.env ? `/${this.env}` : "";
    return `${this.apiUrl}/api/${this.apiVersion}${envSegment}`;
  },
};
