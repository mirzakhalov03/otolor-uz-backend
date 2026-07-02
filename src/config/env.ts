import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const allowedNodeEnvs = new Set(['development', 'test', 'production']);
const nodeEnv = process.env.NODE_ENV || 'development';

if (!allowedNodeEnvs.has(nodeEnv)) {
  throw new Error(
    `Invalid NODE_ENV "${nodeEnv}". Allowed values: development, test, production.`
  );
}

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  port: parseInt(process.env.PORT || '5050', 10),
  nodeEnv,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/otolor-appointments',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim()),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  logLevel: process.env.LOG_LEVEL || 'dev',
  clinicTimezone: process.env.CLINIC_TIMEZONE || 'Asia/Tashkent',
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminUsername: requireEnv('ADMIN_USERNAME'),
  adminPassword: requireEnv('ADMIN_PASSWORD'),
  awsRegion: process.env.AWS_REGION || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsS3BucketName: process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || '',
  awsS3Folder: process.env.AWS_S3_FOLDER || '',
  awsS3PublicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL || '',
};
