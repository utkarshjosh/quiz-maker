import environment from '@/lib/environment';

export const authConfig = {
  get auth0() {
    const config = environment.getConfig();
    return config.auth0;
  },
  get jwt() {
    const config = environment.getConfig();
    return config.jwt;
  },
  get frontend() {
    const config = environment.getConfig();
    return config.frontend;
  },
};
