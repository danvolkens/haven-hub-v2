import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from './storage-utils';
import { type StoragePath } from './r2-client';
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
