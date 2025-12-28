import { NextRequest, NextResponse } from 'next/server';
import { handleFileUpload } from '@/lib/storage/upload-handler';
import { STORAGE_PATHS } from '@/lib/storage/r2-client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const response = await handleFileUpload(request, STORAGE_PATHS.ASSETS, {
      prefix: 'instagram',
      allowedTypes: ALLOWED_TYPES,
      maxSize: MAX_SIZE,
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      url: data.url,
      key: data.key,
    });
  } catch (error) {
    console.error('Instagram upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
