import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_CONFIG, STORAGE_PATHS, type StoragePath } from './r2-client';

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/zip',
  'text/csv',
  'application/json',
];

// Size limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Generate a unique storage key
 */
export function generateStorageKey(
  path: StoragePath,
  userId: string,
  filename: string,
  prefix?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop() || '';
  const safeName = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Sanitize
    .substring(0, 50); // Limit length

  const parts = [path, userId];
  if (prefix) parts.push(prefix);
  parts.push(`${timestamp}-${random}-${safeName}.${ext}`);

  return parts.join('/');
}

/**
 * Upload a file to R2
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob | ReadableStream,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  await r2Client.send(command);

  return getPublicUrl(key);
}

/**
 * Upload an image with validation
 */
export async function uploadImage(
  path: StoragePath,
  userId: string,
  file: File | Buffer,
  options?: {
    filename?: string;
    prefix?: string;
    metadata?: Record<string, string>;
  }
): Promise<{ url: string; key: string }> {
  let buffer: Buffer;
  let contentType: string;
  let filename: string;

  if (file instanceof File) {
    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`Invalid image type: ${file.type}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }
    // Validate size
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`File too large. Max size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }

    buffer = Buffer.from(await file.arrayBuffer());
    contentType = file.type;
    filename = options?.filename || file.name;
  } else {
    buffer = file;
    contentType = options?.filename?.endsWith('.png') ? 'image/png' : 'image/jpeg';
    filename = options?.filename || `image-${Date.now()}.jpg`;
  }

  const key = generateStorageKey(path, userId, filename, options?.prefix);
  const url = await uploadFile(key, buffer, contentType, options?.metadata);

  return { url, key };
}

/**
 * Get a signed URL for uploading (client-side direct upload)
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get a signed URL for downloading (private files)
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
  filename?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    ...(filename && {
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get the public URL for a file
 */
export function getPublicUrl(key: string): string {
  return `${R2_CONFIG.publicUrl}/${key}`;
}

/**
 * Check if a file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<{
  contentType: string;
  contentLength: number;
  lastModified: Date;
  metadata: Record<string, string>;
} | null> {
  try {
    const response = await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
      })
    );

    return {
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch (error) {
    return null;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
    })
  );
}

/**
 * Delete multiple files
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteFile(key)));
}

/**
 * List files in a path
 */
export async function listFiles(
  prefix: string,
  options?: {
    maxKeys?: number;
    continuationToken?: string;
  }
): Promise<{
  files: Array<{ key: string; size: number; lastModified: Date }>;
  nextToken?: string;
}> {
  const response = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: prefix,
      MaxKeys: options?.maxKeys || 1000,
      ContinuationToken: options?.continuationToken,
    })
  );

  return {
    files:
      response.Contents?.map((obj) => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
      })) || [],
    nextToken: response.NextContinuationToken,
  };
}

/**
 * Copy a file to a new location
 */
export async function copyFile(sourceKey: string, destinationKey: string): Promise<string> {
  await r2Client.send(
    new CopyObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      CopySource: `${R2_CONFIG.bucketName}/${sourceKey}`,
      Key: destinationKey,
    })
  );

  return getPublicUrl(destinationKey);
}

/**
 * Move a file (copy then delete)
 */
export async function moveFile(sourceKey: string, destinationKey: string): Promise<string> {
  const newUrl = await copyFile(sourceKey, destinationKey);
  await deleteFile(sourceKey);
  return newUrl;
}

/**
 * Get file as buffer (for processing)
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
    })
  );

  const stream = response.Body;
  if (!stream) {
    throw new Error('No body in response');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
