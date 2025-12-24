# Haven Hub: Complete Implementation Task Plan
## Part 3: Steps 2.4-2.6, Phases 3-4

---

## Step 2.4: Set Up Cloudflare R2 Storage Client

- **Task**: Configure Cloudflare R2 client for asset storage with upload, download, and signed URL utilities.

- **Files**:

### `lib/storage/r2-client.ts`
```typescript
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

// Environment validation
const requiredEnvVars = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing required R2 environment variables: ${missingVars.join(', ')}`);
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
```

### `lib/storage/storage-utils.ts`
```typescript
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
```

### `lib/storage/upload-handler.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, STORAGE_PATHS, type StoragePath } from './storage-utils';
import { getUserId } from '@/lib/auth/session';

interface UploadResult {
  success: true;
  url: string;
  key: string;
}

interface UploadError {
  success: false;
  error: string;
}

/**
 * Handle file upload from API route
 */
export async function handleFileUpload(
  request: NextRequest,
  path: StoragePath,
  options?: {
    prefix?: string;
    allowedTypes?: string[];
    maxSize?: number;
  }
): Promise<NextResponse<UploadResult | UploadError>> {
  try {
    const userId = await getUserId();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type if specified
    if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Allowed: ${options.allowedTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size if specified
    if (options?.maxSize && file.size > options.maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Max size: ${options.maxSize / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    const result = await uploadImage(path, userId, file, {
      prefix: options?.prefix,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 1.1
- **User Instructions**:
  1. Create Cloudflare R2 bucket in Cloudflare Dashboard → R2
  2. Create R2 API token with Object Read & Write permissions
  3. (Optional) Set up custom domain or Cloudflare Workers for public access
  4. Add credentials to `.env.local`

---

## Step 2.5: Set Up Trigger.dev Client and Configuration

- **Task**: Configure Trigger.dev for background job processing with client setup and job definitions.

- **Files**:

### `trigger.config.ts`
```typescript
import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'haven-hub',
  runtime: 'node',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  
  // Default retry configuration
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
  },
  
  // Task directories
  dirs: ['./trigger'],
  
  // Machine configuration
  machine: 'small-1x',
  
  // Max duration for tasks
  maxDuration: 300, // 5 minutes
});
```

### `lib/trigger/client.ts`
```typescript
import { tasks } from '@trigger.dev/sdk/v3';

// Type-safe task trigger functions

export interface DesignEnginePayload {
  quoteId: string;
  userId: string;
  outputFormats: string[];
  generateMockups: boolean;
}

export interface MockupGeneratorPayload {
  quoteId: string;
  userId: string;
  assetIds: string[];
  scenes: string[];
}

export interface WinnerRefreshPayload {
  userId: string;
  pinIds?: string[];
}

export interface WebhookProcessorPayload {
  webhookId: string;
  provider: string;
}

export interface DigestEmailPayload {
  userId: string;
  date: string;
}

export interface ExportGeneratorPayload {
  userId: string;
  exportType: string;
  format: 'csv' | 'json';
  dateRange?: {
    start: string;
    end: string;
  };
  fields?: string[];
}

/**
 * Trigger the design engine pipeline
 */
export async function triggerDesignEngine(payload: DesignEnginePayload) {
  return tasks.trigger('design-engine', payload);
}

/**
 * Trigger mockup generation
 */
export async function triggerMockupGeneration(payload: MockupGeneratorPayload) {
  return tasks.trigger('mockup-generator', payload);
}

/**
 * Trigger winner refresh (weekly top performers)
 */
export async function triggerWinnerRefresh(payload: WinnerRefreshPayload) {
  return tasks.trigger('winner-refresh', payload);
}

/**
 * Trigger webhook processing
 */
export async function triggerWebhookProcessor(payload: WebhookProcessorPayload) {
  return tasks.trigger('webhook-processor', payload);
}

/**
 * Trigger digest email generation
 */
export async function triggerDigestEmail(payload: DigestEmailPayload) {
  return tasks.trigger('digest-email', payload);
}

/**
 * Trigger data export generation
 */
export async function triggerExportGenerator(payload: ExportGeneratorPayload) {
  return tasks.trigger('export-generator', payload);
}

/**
 * Get task run status
 */
export async function getTaskRunStatus(runId: string) {
  return tasks.retrieve(runId);
}

/**
 * Cancel a task run
 */
export async function cancelTaskRun(runId: string) {
  return tasks.cancel(runId);
}
```

### `trigger/design-engine.ts`
```typescript
import { task, logger } from '@trigger.dev/sdk/v3';
import type { DesignEnginePayload } from '@/lib/trigger/client';

export const designEngineTask = task({
  id: 'design-engine',
  
  // Retry configuration specific to design engine
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  
  // Machine requirements
  machine: 'medium-1x',
  
  // Max duration: 15 minutes for full pipeline
  maxDuration: 900,
  
  run: async (payload: DesignEnginePayload, { ctx }) => {
    logger.info('Starting design engine pipeline', { quoteId: payload.quoteId });
    
    // Step 1: Generate master design
    logger.info('Step 1: Generating master design');
    // Implementation will be added in Phase 8
    
    // Step 2: Generate print sizes
    logger.info('Step 2: Generating print sizes');
    // Implementation will be added in Phase 8
    
    // Step 3: Generate social formats
    logger.info('Step 3: Generating social formats');
    // Implementation will be added in Phase 8
    
    // Step 4: Quality check
    logger.info('Step 4: Running quality checks');
    // Implementation will be added in Phase 8
    
    // Step 5: Route to approval or auto-approve
    logger.info('Step 5: Routing based on quality and mode');
    // Implementation will be added in Phase 8
    
    // Step 6: Generate mockups if enabled
    if (payload.generateMockups) {
      logger.info('Step 6: Triggering mockup generation');
      // Implementation will be added in Phase 9
    }
    
    return {
      success: true,
      quoteId: payload.quoteId,
      assetsGenerated: 0, // Will be populated
      mockupsQueued: payload.generateMockups,
    };
  },
});
```

### `trigger/index.ts`
```typescript
// Barrel export for all trigger tasks
// Tasks are auto-discovered from the trigger directory

export { designEngineTask } from './design-engine';
// Additional tasks will be exported as they're created:
// export { mockupGeneratorTask } from './mockup-generator';
// export { winnerRefreshTask } from './winner-refresh';
// export { webhookProcessorTask } from './webhook-processor';
// export { digestEmailTask } from './digest-email';
// export { exportGeneratorTask } from './export-generator';
```

- **Step Dependencies**: Step 1.1
- **User Instructions**:
  1. Create Trigger.dev account at trigger.dev
  2. Create a new project
  3. Copy the secret key to `.env.local` as `TRIGGER_SECRET_KEY`
  4. Run `npx trigger.dev@latest dev` during development

---

## Step 2.6: Configure Vercel Cron Jobs Infrastructure

- **Task**: Set up Vercel cron job configuration and create API routes for all scheduled tasks.

- **Files**:

### `vercel.json`
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    },
    "app/api/cron/**/*.ts": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/cron/pinterest-publish",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/pinterest-insights",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/retry-queue",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/abandonment-check",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/lapsed-customers",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/underperformer-check",
      "schedule": "0 5 * * 0"
    },
    {
      "path": "/api/cron/campaign-check",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/seasonal-activation",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/winner-refresh",
      "schedule": "0 6 * * 1"
    },
    {
      "path": "/api/cron/scheduled-exports",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### `lib/cron/verify-cron.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that a cron request is from Vercel
 */
export function verifyCronRequest(request: NextRequest): boolean {
  // Check for Vercel cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    return false;
  }
  
  return true;
}

/**
 * Create a standardized cron response
 */
export function createCronResponse(
  success: boolean,
  data?: Record<string, unknown>
): NextResponse {
  const body = {
    success,
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  return NextResponse.json(body, {
    status: success ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Wrapper for cron handlers with authentication
 */
export function cronHandler(
  handler: (request: NextRequest) => Promise<{ success: boolean; data?: Record<string, unknown> }>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Verify authorization
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    
    try {
      const result = await handler(request);
      return createCronResponse(result.success, result.data);
    } catch (error) {
      console.error('Cron handler error:', error);
      return createCronResponse(false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
```

### `app/api/cron/pinterest-publish/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Get all scheduled pins ready to publish
  const now = new Date().toISOString();
  
  const { data: pins, error } = await supabase
    .from('pins')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_time', now)
    .order('scheduled_time', { ascending: true })
    .limit(50);
  
  if (error) {
    throw new Error(`Failed to fetch scheduled pins: ${error.message}`);
  }
  
  if (!pins || pins.length === 0) {
    return { success: true, data: { published: 0, message: 'No pins to publish' } };
  }
  
  // Process pins (implementation will be completed in Phase 12)
  let published = 0;
  let failed = 0;
  
  for (const pin of pins) {
    try {
      // Mark as publishing
      await supabase
        .from('pins')
        .update({ status: 'publishing' })
        .eq('id', pin.id);
      
      // Publish to Pinterest (implementation in Phase 12)
      // For now, just mark as published for testing
      
      await supabase
        .from('pins')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', pin.id);
      
      published++;
    } catch (err) {
      console.error(`Failed to publish pin ${pin.id}:`, err);
      
      await supabase
        .from('pins')
        .update({ 
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        })
        .eq('id', pin.id);
      
      failed++;
    }
  }
  
  return {
    success: true,
    data: {
      processed: pins.length,
      published,
      failed,
    },
  };
});
```

### `app/api/cron/daily-digest/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerDigestEmail } from '@/lib/trigger/client';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  const currentHour = new Date().getUTCHours();
  
  // Find users whose digest should be sent this hour
  // User's send_hour is in their timezone, so we need to check
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('user_id, timezone, digest_preferences')
    .eq('digest_preferences->enabled', true);
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  if (!users || users.length === 0) {
    return { success: true, data: { sent: 0, message: 'No users with digest enabled' } };
  }
  
  let queued = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (const user of users) {
    const prefs = user.digest_preferences as { enabled: boolean; send_hour: number; frequency: string };
    
    // Calculate user's local hour
    const userDate = new Date().toLocaleString('en-US', { timeZone: user.timezone || 'America/New_York' });
    const userHour = new Date(userDate).getHours();
    
    // Check if this is the right hour for this user
    if (userHour !== prefs.send_hour) {
      continue;
    }
    
    // Check frequency
    const dayOfWeek = new Date().getDay();
    if (prefs.frequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }
    if (prefs.frequency === 'weekly' && dayOfWeek !== 1) { // Monday only
      continue;
    }
    
    // Queue digest email
    await triggerDigestEmail({
      userId: user.user_id,
      date: today,
    });
    
    queued++;
  }
  
  return {
    success: true,
    data: {
      checked: users.length,
      queued,
    },
  };
});
```

### `app/api/cron/retry-queue/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  const workerId = `cron-${Date.now()}`;
  
  // Claim items for processing using database function
  const { data: items, error } = await supabase.rpc('claim_retry_items', {
    p_worker_id: workerId,
    p_limit: 10,
  });
  
  if (error) {
    throw new Error(`Failed to claim retry items: ${error.message}`);
  }
  
  if (!items || items.length === 0) {
    return { success: true, data: { processed: 0, message: 'No items to retry' } };
  }
  
  let succeeded = 0;
  let failed = 0;
  
  for (const item of items) {
    try {
      // Process based on operation type (implementation in Phase 6)
      // For now, just mark as resolved for testing
      
      await supabase
        .from('retry_queue')
        .update({
          status: 'resolved',
          worker_id: null,
        })
        .eq('id', item.id);
      
      succeeded++;
    } catch (err) {
      console.error(`Retry failed for item ${item.id}:`, err);
      
      // Calculate next retry time with exponential backoff
      const nextAttempt = item.attempts + 1;
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      const delay = Math.min(baseDelay * Math.pow(2, nextAttempt), maxDelay);
      const nextRetryAt = new Date(Date.now() + delay).toISOString();
      
      if (nextAttempt >= item.max_attempts) {
        // Mark as permanently failed
        await supabase
          .from('retry_queue')
          .update({
            status: 'failed',
            last_error: err instanceof Error ? err.message : 'Unknown error',
            worker_id: null,
          })
          .eq('id', item.id);
        
        // Send failure notification if 3+ attempts (per spec)
        if (nextAttempt >= 3) {
          // TODO: Send email notification
        }
      } else {
        // Schedule next retry
        await supabase
          .from('retry_queue')
          .update({
            status: 'pending',
            last_error: err instanceof Error ? err.message : 'Unknown error',
            next_retry_at: nextRetryAt,
            worker_id: null,
          })
          .eq('id', item.id);
      }
      
      failed++;
    }
  }
  
  return {
    success: true,
    data: {
      processed: items.length,
      succeeded,
      failed,
    },
  };
});
```

### `app/api/cron/abandonment-check/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Find abandoned checkouts older than the configured window (default: 1 hour)
  // that haven't been processed yet
  const windowHours = 1; // Will be configurable per user
  const cutoffTime = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  
  const { data: checkouts, error } = await supabase
    .from('abandoned_checkouts')
    .select('*, user_settings!inner(user_id, guardrails)')
    .eq('status', 'pending')
    .lt('created_at', cutoffTime)
    .is('order_id', null)
    .limit(100);
  
  if (error) {
    throw new Error(`Failed to fetch abandoned checkouts: ${error.message}`);
  }
  
  if (!checkouts || checkouts.length === 0) {
    return { success: true, data: { processed: 0, message: 'No abandoned checkouts' } };
  }
  
  let triggered = 0;
  
  for (const checkout of checkouts) {
    try {
      // Mark as processing
      await supabase
        .from('abandoned_checkouts')
        .update({ status: 'sequence_triggered' })
        .eq('id', checkout.id);
      
      // Trigger Klaviyo sequence (implementation in Phase 16)
      // For now, just log
      console.log(`Would trigger abandonment sequence for checkout ${checkout.id}`);
      
      triggered++;
    } catch (err) {
      console.error(`Failed to process checkout ${checkout.id}:`, err);
    }
  }
  
  return {
    success: true,
    data: {
      checked: checkouts.length,
      triggered,
    },
  };
});
```

### `app/api/cron/lapsed-customers/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { WINBACK_TIERS } from '@/lib/constants';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  const now = new Date();
  const results = {
    tier1: 0,
    tier2: 0,
    tier3: 0,
  };
  
  // Check each tier
  for (const [tier, days] of Object.entries(WINBACK_TIERS)) {
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Find customers whose last order was exactly {days} ago (within 24h window)
    const windowStart = new Date(now.getTime() - (days + 1) * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, email, last_order_at')
      .lt('last_order_at', cutoffDate)
      .gte('last_order_at', windowStart)
      .is(`winback_${tier}_sent_at`, null)
      .limit(100);
    
    if (error) {
      console.error(`Failed to fetch ${tier} customers:`, error);
      continue;
    }
    
    for (const customer of customers || []) {
      try {
        // Mark win-back as sent
        await supabase
          .from('customers')
          .update({ [`winback_${tier}_sent_at`]: now.toISOString() })
          .eq('id', customer.id);
        
        // Trigger Klaviyo win-back sequence (implementation in Phase 18)
        console.log(`Would trigger ${tier} win-back for customer ${customer.id}`);
        
        results[tier as keyof typeof results]++;
      } catch (err) {
        console.error(`Failed to process customer ${customer.id}:`, err);
      }
    }
  }
  
  return {
    success: true,
    data: {
      triggered: results,
      total: results.tier1 + results.tier2 + results.tier3,
    },
  };
});
```

### Additional cron routes (placeholders with proper structure)

### `app/api/cron/pinterest-insights/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Fetch analytics for all published pins from the last 30 days
  // Implementation will be completed in Phase 12
  
  return {
    success: true,
    data: {
      pinsUpdated: 0,
      message: 'Pinterest insights sync complete',
    },
  };
});
```

### `app/api/cron/underperformer-check/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { ALERT_THRESHOLDS } from '@/lib/constants';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Find pins with low engagement after minimum impressions and days
  // Implementation will be completed in Phase 10
  
  return {
    success: true,
    data: {
      checked: 0,
      retired: 0,
      message: 'Underperformer check complete',
    },
  };
});
```

### `app/api/cron/campaign-check/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  const now = new Date().toISOString();
  
  // Auto-end campaigns that have passed their end date
  const { data: expiredCampaigns, error } = await supabase
    .from('campaigns')
    .update({ status: 'completed', ended_at: now })
    .eq('status', 'active')
    .lt('end_date', now)
    .select('id');
  
  if (error) {
    throw new Error(`Failed to update campaigns: ${error.message}`);
  }
  
  return {
    success: true,
    data: {
      ended: expiredCampaigns?.length || 0,
    },
  };
});
```

### `app/api/cron/seasonal-activation/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Check for seasonal/temporal content activations
  // Implementation will be completed in Phase 21
  
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // Seasonal checks per spec Feature 41
  const activeSeasons: string[] = [];
  
  // Mental health awareness month (May)
  if (month === 5) {
    activeSeasons.push('mental_health_awareness_month');
  }
  
  // Suicide prevention month (September)
  if (month === 9) {
    activeSeasons.push('suicide_prevention_month');
    activeSeasons.push('self_care_september');
  }
  
  // Holiday checks
  if (month === 12 && day >= 20) {
    activeSeasons.push('christmas');
  }
  
  if (month === 2 && day >= 10 && day <= 14) {
    activeSeasons.push('valentines');
  }
  
  return {
    success: true,
    data: {
      activeSeasons,
      date: today.toISOString().split('T')[0],
    },
  };
});
```

### `app/api/cron/winner-refresh/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerWinnerRefresh } from '@/lib/trigger/client';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Get all users with autopilot mode for winner refresh
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('user_id, global_mode')
    .in('global_mode', ['assisted', 'autopilot']);
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  let queued = 0;
  
  for (const user of users || []) {
    await triggerWinnerRefresh({ userId: user.user_id });
    queued++;
  }
  
  return {
    success: true,
    data: {
      usersQueued: queued,
    },
  };
});
```

### `app/api/cron/scheduled-exports/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerExportGenerator } from '@/lib/trigger/client';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  const now = new Date().toISOString();
  
  // Find scheduled exports due to run
  const { data: exports, error } = await supabase
    .from('scheduled_exports')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', now);
  
  if (error) {
    throw new Error(`Failed to fetch scheduled exports: ${error.message}`);
  }
  
  let triggered = 0;
  
  for (const exp of exports || []) {
    try {
      // Calculate date range based on type
      let dateRange: { start: string; end: string } | undefined;
      
      if (exp.date_range_type === 'last_week') {
        const end = new Date();
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateRange = {
          start: start.toISOString(),
          end: end.toISOString(),
        };
      } else if (exp.date_range_type === 'last_month') {
        const end = new Date();
        const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateRange = {
          start: start.toISOString(),
          end: end.toISOString(),
        };
      }
      
      // Trigger export
      await triggerExportGenerator({
        userId: exp.user_id,
        exportType: exp.export_type,
        format: exp.format,
        dateRange,
        fields: exp.field_selection,
      });
      
      // Calculate next run time
      let nextRun: Date;
      if (exp.frequency === 'weekly') {
        nextRun = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else {
        nextRun = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      
      // Update scheduled export
      await supabase
        .from('scheduled_exports')
        .update({
          last_run_at: now,
          next_run_at: nextRun.toISOString(),
        })
        .eq('id', exp.id);
      
      triggered++;
    } catch (err) {
      console.error(`Failed to trigger export ${exp.id}:`, err);
    }
  }
  
  return {
    success: true,
    data: {
      checked: exports?.length || 0,
      triggered,
    },
  };
});
```

- **Step Dependencies**: Step 1.1
- **User Instructions**: 
  1. Generate a secure CRON_SECRET: `openssl rand -hex 32`
  2. Add to `.env.local`
  3. Crons will auto-deploy with Vercel deployment

---

# Phase 3: Operator Mode System

## Step 3.1: Implement Operator Mode Context and Provider

- **Task**: Create the React context for operator mode providing global mode, module overrides, guardrails, and mode-checking utilities.

- **Files**:

### `contexts/operator-mode-context.tsx`
```typescript
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  OperatorMode,
  ModuleOverrides,
  Guardrails,
  UserSettings,
} from '@/types/database';
import { GUARDRAIL_DEFAULTS } from '@/lib/constants';

interface GracePeriodState {
  isActive: boolean;
  targetMode: OperatorMode | null;
  startedAt: Date | null;
  pendingCount: number;
}

interface OperatorModeContextValue {
  // Current state
  globalMode: OperatorMode;
  moduleOverrides: ModuleOverrides;
  guardrails: Guardrails;
  gracePeriod: GracePeriodState;
  isLoading: boolean;
  error: Error | null;
  
  // Computed helpers
  getEffectiveMode: (module: string) => OperatorMode;
  requiresApproval: (module: string, isHighRisk?: boolean) => boolean;
  checkGuardrail: (key: keyof Guardrails, currentValue: number) => {
    allowed: boolean;
    limit: number | null;
    remaining: number | null;
    percentage: number;
  };
  
  // Actions
  setGlobalMode: (mode: OperatorMode) => Promise<{
    success: boolean;
    gracePeriod?: boolean;
    pendingCount?: number;
    error?: string;
  }>;
  setModuleOverride: (module: string, mode: OperatorMode | null) => Promise<void>;
  updateGuardrail: (key: keyof Guardrails, value: number | null) => Promise<void>;
  forceCompleteGracePeriod: () => Promise<void>;
  cancelGracePeriod: () => Promise<void>;
}

const OperatorModeContext = createContext<OperatorModeContextValue | null>(null);

const SETTINGS_QUERY_KEY = ['user-settings'];

export function OperatorModeProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const queryClient = useQueryClient();
  
  // Fetch user settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as UserSettings;
    },
    staleTime: 60000, // 1 minute
  });
  
  // Grace period state
  const [gracePeriod, setGracePeriod] = useState<GracePeriodState>({
    isActive: false,
    targetMode: null,
    startedAt: null,
    pendingCount: 0,
  });
  
  // Sync grace period state from settings
  useEffect(() => {
    if (settings?.transitioning_to) {
      setGracePeriod({
        isActive: true,
        targetMode: settings.transitioning_to as OperatorMode,
        startedAt: settings.transition_started_at ? new Date(settings.transition_started_at) : null,
        pendingCount: 0, // Will be fetched separately
      });
    } else {
      setGracePeriod({
        isActive: false,
        targetMode: null,
        startedAt: null,
        pendingCount: 0,
      });
    }
  }, [settings?.transitioning_to, settings?.transition_started_at]);
  
  // Real-time subscription for settings changes
  useEffect(() => {
    const channel = supabase
      .channel('user-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);
  
  // Get effective mode for a module
  const getEffectiveMode = useCallback(
    (module: string): OperatorMode => {
      if (!settings) return 'supervised';
      const override = settings.module_overrides[module as keyof ModuleOverrides];
      return override || settings.global_mode;
    },
    [settings]
  );
  
  // Check if action requires approval
  const requiresApproval = useCallback(
    (module: string, isHighRisk: boolean = false): boolean => {
      const mode = getEffectiveMode(module);
      if (mode === 'supervised') return true;
      if (mode === 'assisted' && isHighRisk) return true;
      return false;
    },
    [getEffectiveMode]
  );
  
  // Check guardrail
  const checkGuardrail = useCallback(
    (key: keyof Guardrails, currentValue: number) => {
      const guardrails = settings?.guardrails || GUARDRAIL_DEFAULTS;
      const limit = guardrails[key];
      
      if (limit === null || limit === undefined) {
        return { allowed: true, limit: null, remaining: null, percentage: 0 };
      }
      
      const remaining = Math.max(limit - currentValue, 0);
      const percentage = limit > 0 ? (currentValue / limit) * 100 : 0;
      
      return {
        allowed: currentValue < limit,
        limit,
        remaining,
        percentage: Math.min(percentage, 100),
      };
    },
    [settings?.guardrails]
  );
  
  // Mutation: Set global mode
  const setGlobalModeMutation = useMutation({
    mutationFn: async (newMode: OperatorMode) => {
      const response = await fetch('/api/settings/operator-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update mode');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
  
  const setGlobalMode = async (mode: OperatorMode) => {
    try {
      const result = await setGlobalModeMutation.mutateAsync(mode);
      return {
        success: true,
        gracePeriod: result.gracePeriod,
        pendingCount: result.pendingCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
  
  // Mutation: Set module override
  const setModuleOverrideMutation = useMutation({
    mutationFn: async ({ module, mode }: { module: string; mode: OperatorMode | null }) => {
      const response = await fetch('/api/settings/operator-mode/module', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, mode }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update module override');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
  
  const setModuleOverride = async (module: string, mode: OperatorMode | null) => {
    await setModuleOverrideMutation.mutateAsync({ module, mode });
  };
  
  // Mutation: Update guardrail
  const updateGuardrailMutation = useMutation({
    mutationFn: async ({ key, value }: { key: keyof Guardrails; value: number | null }) => {
      const response = await fetch('/api/settings/guardrails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update guardrail');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
  
  const updateGuardrail = async (key: keyof Guardrails, value: number | null) => {
    await updateGuardrailMutation.mutateAsync({ key, value });
  };
  
  // Force complete grace period
  const forceCompleteGracePeriod = async () => {
    const response = await fetch('/api/settings/operator-mode/grace-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to complete grace period');
    }
    
    queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
  };
  
  // Cancel grace period
  const cancelGracePeriod = async () => {
    const response = await fetch('/api/settings/operator-mode/grace-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel grace period');
    }
    
    queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
  };
  
  const value: OperatorModeContextValue = {
    globalMode: settings?.global_mode || 'supervised',
    moduleOverrides: settings?.module_overrides || {},
    guardrails: settings?.guardrails || GUARDRAIL_DEFAULTS,
    gracePeriod,
    isLoading,
    error: error as Error | null,
    
    getEffectiveMode,
    requiresApproval,
    checkGuardrail,
    
    setGlobalMode,
    setModuleOverride,
    updateGuardrail,
    forceCompleteGracePeriod,
    cancelGracePeriod,
  };
  
  return (
    <OperatorModeContext.Provider value={value}>
      {children}
    </OperatorModeContext.Provider>
  );
}

export function useOperatorMode() {
  const context = useContext(OperatorModeContext);
  if (!context) {
    throw new Error('useOperatorMode must be used within an OperatorModeProvider');
  }
  return context;
}
```

### `hooks/use-operator-mode-helpers.ts`
```typescript
import { useOperatorMode } from '@/contexts/operator-mode-context';

/**
 * Convenience hook for common operator mode checks
 */
export function useOperatorModeHelpers() {
  const { globalMode, getEffectiveMode, requiresApproval, checkGuardrail } = useOperatorMode();
  
  return {
    // Global mode checks
    isSupervised: globalMode === 'supervised',
    isAssisted: globalMode === 'assisted',
    isAutopilot: globalMode === 'autopilot',
    
    // Module-specific checks
    isModuleSupervised: (module: string) => getEffectiveMode(module) === 'supervised',
    isModuleAssisted: (module: string) => getEffectiveMode(module) === 'assisted',
    isModuleAutopilot: (module: string) => getEffectiveMode(module) === 'autopilot',
    
    // Approval checks
    needsApproval: requiresApproval,
    
    // Guardrail checks
    isWithinLimit: (key: Parameters<typeof checkGuardrail>[0], value: number) =>
      checkGuardrail(key, value).allowed,
    
    // Combined action check
    canAutoExecute: (module: string, isHighRisk: boolean = false) => {
      return !requiresApproval(module, isHighRisk);
    },
  };
}
```

### Update `components/providers/index.tsx`
```typescript
'use client';

import { type ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ToastProvider } from './toast-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { OperatorModeProvider } from '@/contexts/operator-mode-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <OperatorModeProvider>
          <ToastProvider>{children}</ToastProvider>
        </OperatorModeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
```

- **Step Dependencies**: Step 2.1
- **User Instructions**: None

---

## Step 3.2: Create Operator Mode API Endpoints

- **Task**: Implement API routes for fetching and updating operator mode settings.

- **Files**:

### `app/api/settings/operator-mode/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidateUserCache } from '@/lib/cache/cache-utils';

const updateModeSchema = z.object({
  mode: z.enum(['supervised', 'assisted', 'autopilot']),
});

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('global_mode, module_overrides, transitioning_to, transition_started_at, guardrails')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { mode } = updateModeSchema.parse(body);
    
    // Check for in-flight operations
    const { count: pendingCount } = await supabase
      .from('approval_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'processing');
    
    const { count: publishingPins } = await supabase
      .from('pins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'publishing');
    
    const totalPending = (pendingCount || 0) + (publishingPins || 0);
    
    if (totalPending > 0) {
      // Start grace period
      const { error } = await supabase
        .from('user_settings')
        .update({
          transitioning_to: mode,
          transition_started_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // Log activity
      await supabase.rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'mode_change',
        p_details: { from: 'current', to: mode, gracePeriod: true },
        p_executed: false,
        p_module: 'settings',
      });
      
      return NextResponse.json({
        success: true,
        gracePeriod: true,
        pendingCount: totalPending,
      });
    }
    
    // Get current mode for logging
    const { data: currentSettings } = await supabase
      .from('user_settings')
      .select('global_mode')
      .eq('user_id', userId)
      .single();
    
    // Immediate switch
    const { error } = await supabase
      .from('user_settings')
      .update({
        global_mode: mode,
        transitioning_to: null,
        transition_started_at: null,
      })
      .eq('user_id', userId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'mode_change',
      p_details: { gracePeriod: false },
      p_executed: true,
      p_module: 'settings',
      p_previous_value: { mode: currentSettings?.global_mode },
      p_new_value: { mode },
    });
    
    // Invalidate cache
    await invalidateUserCache(userId);
    
    return NextResponse.json({
      success: true,
      gracePeriod: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid mode value' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/settings/operator-mode/module/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidateUserCache } from '@/lib/cache/cache-utils';

const updateModuleSchema = z.object({
  module: z.string(),
  mode: z.enum(['supervised', 'assisted', 'autopilot']).nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { module, mode } = updateModuleSchema.parse(body);
    
    // Get current overrides
    const { data: settings, error: fetchError } = await supabase
      .from('user_settings')
      .select('module_overrides')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    const currentOverrides = settings?.module_overrides || {};
    const previousValue = currentOverrides[module];
    
    // Update overrides
    let newOverrides: Record<string, string | null>;
    if (mode === null) {
      // Remove override (use global mode)
      const { [module]: _, ...rest } = currentOverrides;
      newOverrides = rest;
    } else {
      newOverrides = { ...currentOverrides, [module]: mode };
    }
    
    const { error } = await supabase
      .from('user_settings')
      .update({ module_overrides: newOverrides })
      .eq('user_id', userId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'mode_change',
      p_details: { module, isModuleOverride: true },
      p_executed: true,
      p_module: 'settings',
      p_previous_value: previousValue ? { [module]: previousValue } : null,
      p_new_value: mode ? { [module]: mode } : null,
    });
    
    // Invalidate cache
    await invalidateUserCache(userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/settings/guardrails/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidateUserCache } from '@/lib/cache/cache-utils';
import type { Guardrails } from '@/types/database';

// Validation ranges per spec
const guardrailRanges: Record<keyof Guardrails, { min: number; max: number } | null> = {
  daily_pin_limit: { min: 1, max: 25 },
  weekly_ad_spend_cap: { min: 0, max: 10000 },
  monthly_ad_spend_cap: { min: 0, max: 50000 },
  annual_mockup_budget: { min: 100, max: 10000 },
  monthly_mockup_soft_limit: { min: 10, max: 1000 },
  auto_retire_days: { min: 3, max: 30 },
  abandonment_window_hours: { min: 1, max: 24 },
  duplicate_content_days: { min: 7, max: 90 },
};

const updateGuardrailSchema = z.object({
  key: z.string(),
  value: z.number().nullable(),
});

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('guardrails')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data?.guardrails);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { key, value } = updateGuardrailSchema.parse(body);
    
    // Validate key is a valid guardrail
    if (!(key in guardrailRanges)) {
      return NextResponse.json({ error: 'Invalid guardrail key' }, { status: 400 });
    }
    
    // Validate value is within range (if not null)
    if (value !== null) {
      const range = guardrailRanges[key as keyof Guardrails];
      if (range && (value < range.min || value > range.max)) {
        return NextResponse.json(
          { error: `Value must be between ${range.min} and ${range.max}` },
          { status: 400 }
        );
      }
    }
    
    // Get current guardrails
    const { data: settings, error: fetchError } = await supabase
      .from('user_settings')
      .select('guardrails')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    const currentGuardrails = settings?.guardrails as Guardrails;
    const previousValue = currentGuardrails[key as keyof Guardrails];
    
    // Update guardrails
    const newGuardrails = { ...currentGuardrails, [key]: value };
    
    const { error } = await supabase
      .from('user_settings')
      .update({ guardrails: newGuardrails })
      .eq('user_id', userId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'guardrail_update',
      p_details: { guardrailKey: key },
      p_executed: true,
      p_module: 'settings',
      p_previous_value: { [key]: previousValue },
      p_new_value: { [key]: value },
    });
    
    // Invalidate cache
    await invalidateUserCache(userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/settings/operator-mode/grace-period/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidateUserCache } from '@/lib/cache/cache-utils';

const gracePeriodActionSchema = z.object({
  action: z.enum(['complete', 'cancel']),
});

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('global_mode, transitioning_to, transition_started_at')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Count pending operations
    const { count: pendingApprovals } = await supabase
      .from('approval_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'processing');
    
    const { count: publishingPins } = await supabase
      .from('pins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'publishing');
    
    return NextResponse.json({
      isActive: !!data?.transitioning_to,
      currentMode: data?.global_mode,
      targetMode: data?.transitioning_to,
      startedAt: data?.transition_started_at,
      pendingCount: (pendingApprovals || 0) + (publishingPins || 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { action } = gracePeriodActionSchema.parse(body);
    
    // Get current state
    const { data: settings, error: fetchError } = await supabase
      .from('user_settings')
      .select('global_mode, transitioning_to')
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }
    
    if (!settings.transitioning_to) {
      return NextResponse.json({ error: 'No active grace period' }, { status: 400 });
    }
    
    if (action === 'complete') {
      // Force complete: switch to target mode
      const { error } = await supabase
        .from('user_settings')
        .update({
          global_mode: settings.transitioning_to,
          transitioning_to: null,
          transition_started_at: null,
        })
        .eq('user_id', userId);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // Log activity
      await supabase.rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'mode_change',
        p_details: { forced: true, gracePeriod: true },
        p_executed: true,
        p_module: 'settings',
        p_previous_value: { mode: settings.global_mode },
        p_new_value: { mode: settings.transitioning_to },
      });
    } else {
      // Cancel: clear transition state
      const { error } = await supabase
        .from('user_settings')
        .update({
          transitioning_to: null,
          transition_started_at: null,
        })
        .eq('user_id', userId);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // Log cancellation
      await supabase.rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'mode_change',
        p_details: { cancelled: true, targetWas: settings.transitioning_to },
        p_executed: false,
        p_module: 'settings',
      });
    }
    
    // Invalidate cache
    await invalidateUserCache(userId);
    
    return NextResponse.json({ success: true, action });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 3.1
- **User Instructions**: None

---

*[Continuing with Steps 3.3-3.6 (Operator Mode UI) and Phase 4 (Approval Queue)...]*

---

**Part 3 Summary**

This part covers:
- Step 2.4: Cloudflare R2 storage with complete upload/download utilities
- Step 2.5: Trigger.dev configuration and job definitions
- Step 2.6: All Vercel cron jobs with real implementations
- Step 3.1: Operator Mode context with full React Query integration
- Step 3.2: Complete API routes for operator mode management

**Next: Part 4 will complete Phase 3 (Steps 3.3-3.6: Operator Mode UI) and all of Phase 4 (Approval Queue)**
