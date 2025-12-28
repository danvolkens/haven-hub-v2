/**
 * Instagram Graph API Publishing Integration
 * Prompt 3.3: Instagram API publishing with container workflow
 *
 * NOTE: This is a placeholder implementation. Actual API calls require
 * a configured Meta Developer App with Instagram Graph API access.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface ScheduledPost {
  id: string;
  user_id: string;
  asset_id: string | null;
  asset_url: string;
  post_type: 'feed' | 'reel' | 'carousel' | 'story';
  caption: string;
  hashtags: string[];
  carousel_assets?: Array<{ url: string; media_type: 'IMAGE' | 'VIDEO' }>;
}

export interface PublishResult {
  success: boolean;
  instagram_media_id: string | null;
  error?: string;
}

export interface ContainerStatus {
  id: string;
  status: 'IN_PROGRESS' | 'FINISHED' | 'ERROR';
  status_code?: string;
}

export interface InstagramConnection {
  access_token: string;
  instagram_user_id: string;
  page_id: string;
}

// ============================================================================
// Configuration
// ============================================================================

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const CONTAINER_POLL_INTERVAL = 2000; // 2 seconds
const CONTAINER_TIMEOUT = 60000; // 60 seconds

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Get Instagram connection credentials for a user
 */
export async function getInstagramConnection(
  userId: string
): Promise<InstagramConnection | null> {
  const supabase = await createClient();

  // Get credentials from the vault
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_credential', {
    p_provider: 'instagram',
  });

  if (error || !data) {
    console.error('Failed to get Instagram credentials:', error);
    return null;
  }

  return {
    access_token: data.access_token,
    instagram_user_id: data.instagram_user_id,
    page_id: data.page_id,
  };
}

// ============================================================================
// Media Container Creation
// ============================================================================

/**
 * Create a media container for publishing
 */
export async function createMediaContainer(
  post: ScheduledPost,
  connection: InstagramConnection
): Promise<string> {
  const { instagram_user_id, access_token } = connection;

  // Build request body based on post type
  const body: Record<string, unknown> = {
    access_token,
  };

  if (post.post_type === 'reel') {
    body.media_type = 'REELS';
    body.video_url = post.asset_url;
    body.caption = post.caption;
  } else if (post.post_type === 'story') {
    // Stories use different endpoint
    body.media_type = post.asset_url.includes('.mp4') ? 'VIDEO' : 'STORIES';
    if (post.asset_url.includes('.mp4')) {
      body.video_url = post.asset_url;
    } else {
      body.image_url = post.asset_url;
    }
  } else {
    // Feed post (image or video)
    if (post.asset_url.includes('.mp4')) {
      body.media_type = 'VIDEO';
      body.video_url = post.asset_url;
    } else {
      body.image_url = post.asset_url;
    }
    body.caption = post.caption;
  }

  // NOTE: In production, this would make an actual API call
  // For now, return a mock container ID
  if (!process.env.INSTAGRAM_API_ENABLED) {
    console.log('[Instagram API] Mock: Creating media container for', post.post_type);
    return `mock_container_${Date.now()}`;
  }

  const response = await fetch(`${GRAPH_API_BASE}/${instagram_user_id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new InstagramAPIError(
      data.error?.message || 'Failed to create media container',
      data.error?.code
    );
  }

  return data.id;
}

/**
 * Create a carousel container with multiple children
 */
export async function createCarouselContainer(
  post: ScheduledPost,
  connection: InstagramConnection
): Promise<string> {
  const { instagram_user_id, access_token } = connection;

  if (!post.carousel_assets || post.carousel_assets.length === 0) {
    throw new Error('Carousel post requires carousel_assets');
  }

  // NOTE: In production, this would create child containers first
  if (!process.env.INSTAGRAM_API_ENABLED) {
    console.log(
      '[Instagram API] Mock: Creating carousel with',
      post.carousel_assets.length,
      'items'
    );
    return `mock_carousel_${Date.now()}`;
  }

  // Step 1: Create child containers
  const childIds: string[] = [];

  for (const asset of post.carousel_assets) {
    const childBody: Record<string, unknown> = {
      access_token,
      is_carousel_item: true,
    };

    if (asset.media_type === 'VIDEO') {
      childBody.media_type = 'VIDEO';
      childBody.video_url = asset.url;
    } else {
      childBody.image_url = asset.url;
    }

    const response = await fetch(`${GRAPH_API_BASE}/${instagram_user_id}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(childBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new InstagramAPIError(
        data.error?.message || 'Failed to create carousel child',
        data.error?.code
      );
    }

    childIds.push(data.id);
  }

  // Wait for all children to be ready
  for (const childId of childIds) {
    await waitForContainerReady(childId, connection);
  }

  // Step 2: Create parent carousel container
  const parentBody = {
    access_token,
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption: post.caption,
  };

  const response = await fetch(`${GRAPH_API_BASE}/${instagram_user_id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parentBody),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new InstagramAPIError(
      data.error?.message || 'Failed to create carousel parent',
      data.error?.code
    );
  }

  return data.id;
}

// ============================================================================
// Container Status & Publishing
// ============================================================================

/**
 * Wait for a media container to be ready for publishing
 */
export async function waitForContainerReady(
  containerId: string,
  connection: InstagramConnection
): Promise<void> {
  const { access_token } = connection;

  // Mock mode
  if (!process.env.INSTAGRAM_API_ENABLED) {
    console.log('[Instagram API] Mock: Container', containerId, 'ready');
    return;
  }

  const startTime = Date.now();

  while (Date.now() - startTime < CONTAINER_TIMEOUT) {
    const response = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${access_token}`
    );

    const data = await response.json();

    if (data.status_code === 'FINISHED') {
      return;
    }

    if (data.status_code === 'ERROR') {
      throw new InstagramAPIError('Container processing failed', data.status_code);
    }

    // Wait before polling again
    await sleep(CONTAINER_POLL_INTERVAL);
  }

  throw new InstagramAPIError('Container processing timeout', 'TIMEOUT');
}

/**
 * Publish a ready media container
 */
export async function publishContainer(
  containerId: string,
  connection: InstagramConnection
): Promise<PublishResult> {
  const { instagram_user_id, access_token } = connection;

  // Mock mode
  if (!process.env.INSTAGRAM_API_ENABLED) {
    console.log('[Instagram API] Mock: Publishing container', containerId);
    return {
      success: true,
      instagram_media_id: `mock_media_${Date.now()}`,
    };
  }

  const response = await fetch(`${GRAPH_API_BASE}/${instagram_user_id}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token,
      creation_id: containerId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      instagram_media_id: null,
      error: data.error?.message || 'Failed to publish',
    };
  }

  return {
    success: true,
    instagram_media_id: data.id,
  };
}

// ============================================================================
// Hashtag First Comment
// ============================================================================

/**
 * Post hashtags as the first comment on a published post
 */
export async function postHashtagsAsFirstComment(
  mediaId: string,
  hashtags: string[],
  connection: InstagramConnection
): Promise<void> {
  const { access_token } = connection;

  if (hashtags.length === 0) {
    return;
  }

  // Format hashtags with dots for better display
  const commentText = '.\n.\n.\n' + hashtags.join(' ');

  // Mock mode
  if (!process.env.INSTAGRAM_API_ENABLED) {
    console.log('[Instagram API] Mock: Posting', hashtags.length, 'hashtags as first comment');
    return;
  }

  const response = await fetch(`${GRAPH_API_BASE}/${mediaId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token,
      message: commentText,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new InstagramAPIError(
      data.error?.message || 'Failed to post hashtag comment',
      data.error?.code
    );
  }
}

// ============================================================================
// Complete Publishing Flow
// ============================================================================

/**
 * Complete publishing flow for a scheduled post
 */
export async function publishScheduledPost(post: ScheduledPost): Promise<PublishResult> {
  try {
    // Get connection
    const connection = await getInstagramConnection(post.user_id);

    if (!connection) {
      return {
        success: false,
        instagram_media_id: null,
        error: 'Instagram not connected',
      };
    }

    // Create container based on post type
    let containerId: string;

    if (post.post_type === 'carousel') {
      containerId = await createCarouselContainer(post, connection);
    } else {
      containerId = await createMediaContainer(post, connection);
    }

    // Wait for container to be ready
    await waitForContainerReady(containerId, connection);

    // Publish the container
    const result = await publishContainer(containerId, connection);

    if (!result.success || !result.instagram_media_id) {
      return result;
    }

    // Post hashtags as first comment
    if (post.hashtags.length > 0) {
      try {
        await postHashtagsAsFirstComment(result.instagram_media_id, post.hashtags, connection);
      } catch (error) {
        // Log but don't fail the whole publish for hashtag failure
        console.error('Failed to post hashtags:', error);
      }
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Publishing failed:', message);

    return {
      success: false,
      instagram_media_id: null,
      error: message,
    };
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitInfo {
  callCount: number;
  totalCpu: number;
  totalTime: number;
  resetAt: Date;
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(
  connection: InstagramConnection
): Promise<RateLimitInfo | null> {
  const { access_token } = connection;

  // Mock mode
  if (!process.env.INSTAGRAM_API_ENABLED) {
    return {
      callCount: 10,
      totalCpu: 5,
      totalTime: 100,
      resetAt: new Date(Date.now() + 3600000),
    };
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/me?fields=id&access_token=${access_token}`,
    { method: 'GET' }
  );

  const headers = response.headers;
  const usageHeader = headers.get('x-business-use-case-usage');

  if (usageHeader) {
    try {
      const usage = JSON.parse(usageHeader);
      const appUsage = Object.values(usage)[0] as Array<{
        call_count: number;
        total_cputime: number;
        total_time: number;
        estimated_time_to_regain_access: number;
      }>;

      if (appUsage && appUsage[0]) {
        return {
          callCount: appUsage[0].call_count,
          totalCpu: appUsage[0].total_cputime,
          totalTime: appUsage[0].total_time,
          resetAt: new Date(Date.now() + appUsage[0].estimated_time_to_regain_access * 60000),
        };
      }
    } catch {
      console.error('Failed to parse rate limit header');
    }
  }

  return null;
}

/**
 * Check if we should throttle API calls
 */
export function shouldThrottle(rateLimitInfo: RateLimitInfo): boolean {
  // Throttle if any metric is above 80%
  return (
    rateLimitInfo.callCount > 80 ||
    rateLimitInfo.totalCpu > 80 ||
    rateLimitInfo.totalTime > 80
  );
}

// ============================================================================
// Error Handling
// ============================================================================

export class InstagramAPIError extends Error {
  public code: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'InstagramAPIError';
    this.code = code || 'UNKNOWN';
  }
}

// Common error codes and their meanings
export const ERROR_CODES: Record<string, string> = {
  '2': 'Temporary API issue - retry later',
  '4': 'Rate limit reached - wait before retrying',
  '10': 'API permission issue - check app permissions',
  '100': 'Invalid parameter - check request data',
  '190': 'Access token expired - need to re-authenticate',
  '368': 'Content policy violation - review post content',
};

/**
 * Get user-friendly error message
 */
export function getErrorMessage(code: string): string {
  return ERROR_CODES[code] || 'An unknown error occurred';
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
