import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import environment from '@/lib/environment';

export interface MinimalUserData {
  sub: string; // Auth0 user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  iat: number; // issued at
  exp: number; // expires at
}

export interface DecodedToken {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
  aud?: string;
  iss?: string;
  [key: string]: any;
}

export class JWTService {
  private jwksClient: jwksClient.JwksClient;
  private envConfig: any;

  constructor() {
    this.envConfig = environment.getConfig();

    this.jwksClient = jwksClient({
      jwksUri: `https://${this.envConfig.auth0.domain}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }

  /**
   * Get signing key for JWT verification
   */
  private getSigningKey(header: any, callback: any): void {
    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error('Error getting signing key:', err);
        return callback(err);
      }

      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  }

  /**
   * Verify JWT token using Auth0's JWKS or internal secret
   */
  public async verifyToken(token: string): Promise<DecodedToken> {
    return new Promise((resolve, reject) => {
      // First try to verify as Auth0 token (RS256)
      jwt.verify(
        token,
        this.getSigningKey.bind(this),
        {
          algorithms: ['RS256'],
          audience: this.envConfig.auth0.audience,
          issuer: `https://${this.envConfig.auth0.domain}/`,
        },
        (err, decoded) => {
          if (!err && decoded && typeof decoded === 'object') {
            return resolve(decoded as DecodedToken);
          }

          // If Auth0 verification failed, try internal token verification (HS256)

          jwt.verify(
            token,
            this.envConfig.jwt.secret,
            {
              algorithms: ['HS256'],
              audience: this.envConfig.auth0.audience,
              issuer: `https://${this.envConfig.auth0.domain}/`,
            },
            (internalErr, internalDecoded) => {
              if (internalErr) {
                return reject(new Error('Token verification failed'));
              }

              if (!internalDecoded || typeof internalDecoded !== 'object') {
                return reject(new Error('Invalid token payload'));
              }

              resolve(internalDecoded as DecodedToken);
            }
          );
        }
      );
    });
  }

  /**
   * Extract minimal user data from Auth0 token
   */
  public extractUserData(decodedToken: DecodedToken): MinimalUserData {
    return {
      sub: decodedToken.sub,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified ?? false,
      name: decodedToken.name,
      picture: decodedToken.picture,
      iat: decodedToken.iat,
      exp: decodedToken.exp,
    };
  }

  /**
   * Check if token is expired
   */
  public isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time in seconds
   */
  public getTokenExpiration(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.exp || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a JWT token for internal use
   */
  public generateToken(userData: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    exp?: number;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: userData.sub,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      iat: now,
      exp: userData.exp || now + 15 * 60, // Default 15 minutes
      aud: this.envConfig.auth0.audience,
      iss: `https://${this.envConfig.auth0.domain}/`,
    };

    return jwt.sign(payload, this.envConfig.jwt.secret, {
      algorithm: 'HS256',
    });
  }
}

export default JWTService;
