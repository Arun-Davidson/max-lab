import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import config from '../config';
import logger from '../config/logger';

// Load JWT keys
let accessPrivateKey: string;
let accessPublicKey: string;
let refreshPrivateKey: string;
let refreshPublicKey: string;

try {
  if (config.jwt.useEnvKeys) {
    // Load from environment variables (Vercel/production)
    logger.info('Loading JWT keys from environment variables');

    accessPrivateKey = process.env.JWT_ACCESS_PRIVATE_KEY || '';
    accessPublicKey = process.env.JWT_ACCESS_PUBLIC_KEY || '';
    refreshPrivateKey = process.env.JWT_REFRESH_PRIVATE_KEY || '';
    refreshPublicKey = process.env.JWT_REFRESH_PUBLIC_KEY || '';

    if (!accessPrivateKey || !accessPublicKey || !refreshPrivateKey || !refreshPublicKey) {
      throw new Error(
        'JWT keys not found in environment variables. ' +
          'Please set JWT_ACCESS_PRIVATE_KEY, JWT_ACCESS_PUBLIC_KEY, ' +
          'JWT_REFRESH_PRIVATE_KEY, and JWT_REFRESH_PUBLIC_KEY in your environment.',
      );
    }

    logger.info('JWT keys loaded successfully from environment variables');
    logger.info('POSTGRES_SSL:', config.postgres.ssl?.enabled);
    logger.info('CA present:', !!config.postgres.ssl?.ca);
    logger.info('CA length:', config.postgres.ssl?.ca?.length);
  } else {
    // Load from filesystem (local development)
    logger.info('Loading JWT keys from filesystem');
    logger.info('POSTGRES_SSL:', config.postgres.ssl?.enabled);
    logger.info('CA present:', !!config.postgres.ssl?.ca);
    logger.info('CA length:', config.postgres.ssl?.ca?.length);

    accessPrivateKey = fs.readFileSync(
      path.resolve(process.cwd(), config.jwt.access.privateKeyPath),
      'utf8',
    );
    accessPublicKey = fs.readFileSync(
      path.resolve(process.cwd(), config.jwt.access.publicKeyPath),
      'utf8',
    );
    refreshPrivateKey = fs.readFileSync(
      path.resolve(process.cwd(), config.jwt.refresh.privateKeyPath),
      'utf8',
    );
    refreshPublicKey = fs.readFileSync(
      path.resolve(process.cwd(), config.jwt.refresh.publicKeyPath),
      'utf8',
    );

    logger.info('JWT keys loaded successfully from filesystem');
  }
} catch (error) {
  logger.error('Failed to load JWT keys:', error);

  if (config.jwt.useEnvKeys) {
    logger.error(
      'Set USE_ENV_JWT_KEYS=true in environment and provide JWT keys as environment variables.',
    );
  } else {
    logger.error('Generate JWT keys using: npm run keygen');
  }

  throw error;
}

export interface TokenPayload {
  userId: number;
  email: string;
  admin: boolean;
  role: string | null;
  userType?: 'candidate' | 'business' | 'employer';
}

export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
  tokenId: string;
}

class JWTService {
  /**
   * Sign an access token
   */
  signAccessToken(user: TokenPayload): string {
    const payload: AccessTokenPayload = {
      ...user,
      type: 'access',
    };

    return jwt.sign(payload, accessPrivateKey, {
      algorithm: 'RS256',
      expiresIn: config.jwt.access.ttl,
      issuer: 'HIRION-clone',
      audience: 'HIRION-clone-api',
    } as jwt.SignOptions);
  }

  /**
   * Sign a refresh token with unique token ID
   */
  signRefreshToken(user: TokenPayload): { token: string; tokenId: string } {
    const tokenId = crypto.randomBytes(32).toString('hex');

    const payload: RefreshTokenPayload = {
      ...user,
      type: 'refresh',
      tokenId,
    };

    const token = jwt.sign(payload, refreshPrivateKey, {
      algorithm: 'RS256',
      expiresIn: config.jwt.refresh.ttl,
      issuer: 'HIRION-clone',
      audience: 'HIRION-clone-api',
    } as jwt.SignOptions);

    return { token, tokenId };
  }

  /**
   * Verify an access token
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, accessPublicKey, {
        algorithms: ['RS256'],
        issuer: 'HIRION-clone',
        audience: 'HIRION-clone-api',
      }) as AccessTokenPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify a refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, refreshPublicKey, {
        algorithms: ['RS256'],
        issuer: 'HIRION-clone',
        audience: 'HIRION-clone-api',
      }) as RefreshTokenPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      console.log(decoded, 'decoded');
      return decoded;
    } catch (error) {
      console.log(error);
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Hash a token for secure storage
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Compare token with hash
   */
  async compareToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  /**
   * Decode token without verification (for debugging)
   */
  decode(token: string): any {
    return jwt.decode(token);
  }
}

export default new JWTService();
