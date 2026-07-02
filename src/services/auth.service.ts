import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface AuthTokenPayload {
  sub: string;
  role: 'admin';
}

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};

class AuthService {
  /** Constant-time comparison of both fields (no short-circuit timing leak). */
  verifyCredentials(username: string, password: string): boolean {
    const okUser = safeEqual(username, env.adminUsername);
    const okPass = safeEqual(password, env.adminPassword);
    return okUser && okPass;
  }

  signToken(): string {
    const payload: AuthTokenPayload = { sub: 'admin', role: 'admin' };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}

export const authService = new AuthService();
