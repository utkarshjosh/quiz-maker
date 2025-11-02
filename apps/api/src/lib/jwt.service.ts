import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import environment from '@/lib/environment';

export interface MinimalUserData {
  sub: string; // Auth0 user ID
  email?: string; // Optional - might not be in access_token
  email_verified?: boolean; // Optional
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
      // Decode token header/payload to decide verification strategy
      const decodedComplete = jwt.decode(token, { complete: true }) as any;
      const header = decodedComplete?.header || {};
      const payload = decodedComplete?.payload || {};

      const issuer = `https://${this.envConfig.auth0.domain}/`;
      const apiAudience = this.envConfig.auth0.audience; // API identifier
      const clientId = this.envConfig.auth0.clientId; // Application client ID

      // Detect token type and expected audience
      const audienceClaim = payload?.aud;
      const audienceArray = Array.isArray(audienceClaim)
        ? audienceClaim
        : audienceClaim
          ? [audienceClaim]
          : [];
      const isIdToken = audienceArray.includes(clientId);
      const expectedAudience = isIdToken ? clientId : apiAudience;

      // HS256: our internally generated tokens (e.g., WebSocket token)
      if (header?.alg === 'HS256') {
        jwt.verify(
          token,
          this.envConfig.jwt.secret,
          {
            algorithms: ['HS256'],
            audience: expectedAudience,
            issuer,
          },
          (err, verified) => {
            if (err) {
              console.error('❌ HS256 verification failed:', err.message);
              return reject(new Error('Token verification failed'));
            }
            return resolve(verified as DecodedToken);
          }
        );
        return;
      }

      // RS256: Auth0 issued tokens (id_token or access_token)
      jwt.verify(
        token,
        this.getSigningKey.bind(this),
        {
          algorithms: ['RS256'],
          audience: expectedAudience,
          issuer,
        },
        (err, verified) => {
          if (err) {
            console.error('❌ RS256 verification failed:', {
              error: err.message,
              expectedAudience,
              isIdToken,
              audienceClaim,
            });
            return reject(new Error('Token verification failed'));
          }
          return resolve(verified as DecodedToken);
        }
      );
    });
  }

  /**
   * Extract minimal user data from Auth0 token
   * Note: Access tokens may not contain email/name/picture
   * Only id_tokens are guaranteed to have user profile information
   */
  public extractUserData(decodedToken: DecodedToken): MinimalUserData {
    const userData = {
      sub: decodedToken.sub,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      iat: decodedToken.iat,
      exp: decodedToken.exp,
    };

    // Log warning if email is missing (indicates access_token instead of id_token)
    if (!userData.email) {
      console.warn(
        '⚠️ JWT token missing email - this is likely an access_token, not an id_token'
      );
      console.warn(
        '⚠️ User profile data may be incomplete. Token claims:',
        Object.keys(decodedToken)
      );
    }

    return userData;
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
