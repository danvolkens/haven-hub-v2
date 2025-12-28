/**
 * Creatomate Webhook Handler
 * Prompt 4.4: Process render completion notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { processWebhookPayload, type CreatomateWebhookPayload } from '@/lib/video/creatomate';
import crypto from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

// Optional: Verify webhook signature for security
const WEBHOOK_SECRET = process.env.CREATOMATE_WEBHOOK_SECRET;

// ============================================================================
// Webhook Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse payload
    const payload = await request.json() as CreatomateWebhookPayload;

    // Verify signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-creatomate-signature');
      if (!signature || !verifySignature(JSON.stringify(payload), signature, WEBHOOK_SECRET)) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    console.log('[Creatomate Webhook] Received:', {
      id: payload.id,
      status: payload.status,
      hasUrl: !!payload.url,
      snapshotCount: payload.snapshots?.length || 0,
    });

    // Validate required fields
    if (!payload.id) {
      return NextResponse.json(
        { error: 'Missing render ID' },
        { status: 400 }
      );
    }

    if (!payload.status) {
      return NextResponse.json(
        { error: 'Missing status' },
        { status: 400 }
      );
    }

    // Process the webhook
    const result = await processWebhookPayload(payload);

    if (!result.success) {
      console.error('[Creatomate Webhook] Processing failed:', result.error);
      // Still return 200 to acknowledge receipt
      return NextResponse.json({
        acknowledged: true,
        success: false,
        error: result.error,
      });
    }

    console.log('[Creatomate Webhook] Processed successfully:', {
      videoUrl: result.videoUrl,
      thumbnailCount: result.thumbnailUrls?.length || 0,
    });

    return NextResponse.json({
      acknowledged: true,
      success: true,
      videoUrl: result.videoUrl,
      thumbnailUrls: result.thumbnailUrls,
    });
  } catch (error) {
    console.error('[Creatomate Webhook] Error:', error);

    // Always return 200 to prevent Creatomate from retrying
    // Log the error for debugging
    return NextResponse.json({
      acknowledged: true,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Verify Creatomate webhook signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ============================================================================
// Health Check
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'creatomate-webhook',
    timestamp: new Date().toISOString(),
  });
}
