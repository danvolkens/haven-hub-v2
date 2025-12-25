import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Environment validation - only warn during development, throw at runtime in production
const requiredEnvVars = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  // Only log warning during build - actual usage will fail gracefully
  // with local storage fallback in storage-utils.ts
  console.warn(`[R2] Missing environment variables: ${missingVars.join(', ')}. Using local storage fallback.`);
}

// R2 Configuration
export const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || 'haven-hub-assets',
  publicUrl: process.env.R2_PUBLIC_URL || '',
};

// Create S3-compatible client for R2
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

// Storage paths
export const STORAGE_PATHS = {
  QUOTES: 'quotes',
  ASSETS: 'assets',
  MOCKUPS: 'mockups',
  UGC: 'ugc',
  EXPORTS: 'exports',
  TEMP: 'temp',
} as const;

export type StoragePath = (typeof STORAGE_PATHS)[keyof typeof STORAGE_PATHS];
