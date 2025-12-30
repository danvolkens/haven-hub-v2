# Build Prompt: Instagram Publishing Cron Job

## Context

Haven Hub has:
- ✅ Instagram scheduling UI (calendar, post creation)
- ✅ Post storage in `instagram_scheduled_posts` table
- ✅ Pinterest publishing cron (`/api/cron/pinterest-publish`)
- ❌ **Missing:** Instagram publishing cron

Without this, scheduled Instagram posts never actually publish—they stay in "scheduled" status forever.

## Task

Create a cron job that:
1. Runs every 5 minutes
2. Finds posts due for publishing (status = 'scheduled', scheduled_at <= now)
3. Publishes to Instagram via Graph API
4. Updates status to 'published' or 'failed'
5. Logs activity

## Files to Create

### 1. Create Cron API Route

**Create:** `/src/app/api/cron/instagram-publish/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InstagramClient } from '@/lib/integrations/instagram/client';

// Vercel Cron configuration
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ScheduledPost {
  id: string;
  user_id: string;
  quote_id: string;
  post_type: 'feed' | 'reel' | 'carousel' | 'story';
  caption: string;
  hashtags: string[];
  hashtags_as_comment: boolean;
  asset_url: string;
  video_url?: string;
  thumbnail_url?: string;
  carousel_urls?: string[];
  alt_text?: string;
  scheduled_at: string;
  status: string;
  product_tag_id?: string;
  cross_post_facebook: boolean;
}

interface InstagramConnection {
  access_token: string;
  instagram_user_id: string;
  facebook_page_id?: string;
}

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = await createClient();
  
  const results = {
    processed: 0,
    published: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Find all posts due for publishing
    const now = new Date().toISOString();
    
    const { data: duePosts, error: fetchError } = await supabase
      .from('instagram_scheduled_posts')
      .select(`
        *,
        quotes (
          id,
          text,
          collection
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(10); // Process max 10 per run to avoid timeout

    if (fetchError) {
      throw new Error(`Failed to fetch due posts: ${fetchError.message}`);
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({
        message: 'No posts due for publishing',
        results,
      });
    }

    // Group posts by user to batch API calls
    const postsByUser = duePosts.reduce((acc, post) => {
      if (!acc[post.user_id]) acc[post.user_id] = [];
      acc[post.user_id].push(post);
      return acc;
    }, {} as Record<string, ScheduledPost[]>);

    // Process each user's posts
    for (const [userId, posts] of Object.entries(postsByUser)) {
      // Get user's Instagram connection
      const { data: connection, error: connError } = await supabase
        .from('instagram_connections')
        .select('access_token, instagram_user_id, facebook_page_id')
        .eq('user_id', userId)
        .single();

      if (connError || !connection) {
        // Mark all user's posts as failed
        for (const post of posts) {
          await markPostFailed(supabase, post.id, 'No Instagram connection found');
          results.failed++;
        }
        continue;
      }

      const instagram = new InstagramClient({
        accessToken: connection.access_token,
        instagramUserId: connection.instagram_user_id,
      });

      // Verify token is still valid
      const tokenValid = await instagram.verifyToken();
      if (!tokenValid) {
        for (const post of posts) {
          await markPostFailed(supabase, post.id, 'Instagram access token expired');
          results.failed++;
        }
        // TODO: Send notification to user to reconnect
        continue;
      }

      // Publish each post
      for (const post of posts) {
        results.processed++;
        
        try {
          // Update status to publishing
          await supabase
            .from('instagram_scheduled_posts')
            .update({ status: 'publishing' })
            .eq('id', post.id);

          let mediaId: string;
          let publishedId: string;

          // Handle different post types
          switch (post.post_type) {
            case 'feed':
              // Create image container
              mediaId = await instagram.createImageContainer({
                imageUrl: post.asset_url,
                caption: formatCaption(post),
                ...(post.product_tag_id && { productTags: [post.product_tag_id] }),
              });
              break;

            case 'reel':
              // Create video container
              mediaId = await instagram.createVideoContainer({
                videoUrl: post.video_url!,
                caption: formatCaption(post),
                coverUrl: post.thumbnail_url,
                shareToFeed: true,
              });
              break;

            case 'carousel':
              // Create carousel container
              const childIds = await Promise.all(
                (post.carousel_urls || []).map(url =>
                  instagram.createImageContainer({ imageUrl: url, isCarouselItem: true })
                )
              );
              mediaId = await instagram.createCarouselContainer({
                children: childIds,
                caption: formatCaption(post),
              });
              break;

            case 'story':
              // Stories use different endpoint
              mediaId = await instagram.createStoryContainer({
                imageUrl: post.asset_url,
              });
              break;

            default:
              throw new Error(`Unsupported post type: ${post.post_type}`);
          }

          // Publish the container
          publishedId = await instagram.publishContainer(mediaId);

          // Post hashtags as first comment if configured
          if (post.hashtags_as_comment && post.hashtags?.length > 0 && post.post_type !== 'story') {
            const hashtagText = post.hashtags.map(h => `#${h}`).join(' ');
            await instagram.postComment(publishedId, hashtagText);
          }

          // Cross-post to Facebook if enabled
          if (post.cross_post_facebook && connection.facebook_page_id && post.post_type === 'feed') {
            // Facebook cross-posting handled by Instagram API automatically
            // when the account is linked, but we can track it
          }

          // Update post as published
          await supabase
            .from('instagram_scheduled_posts')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              instagram_media_id: publishedId,
            })
            .eq('id', post.id);

          // Log activity
          await supabase.from('activity_log').insert({
            user_id: userId,
            action: 'instagram_post_published',
            entity_type: 'instagram_scheduled_posts',
            entity_id: post.id,
            details: {
              post_type: post.post_type,
              instagram_media_id: publishedId,
              quote_id: post.quote_id,
            },
          });

          results.published++;

        } catch (publishError: any) {
          console.error(`Failed to publish post ${post.id}:`, publishError);
          
          await markPostFailed(supabase, post.id, publishError.message);
          results.failed++;
          results.errors.push(`Post ${post.id}: ${publishError.message}`);

          // Log error
          await supabase.from('activity_log').insert({
            user_id: userId,
            action: 'instagram_post_failed',
            entity_type: 'instagram_scheduled_posts',
            entity_id: post.id,
            details: {
              error: publishError.message,
              post_type: post.post_type,
            },
          });
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${results.processed} posts: ${results.published} published, ${results.failed} failed`,
      results,
    });

  } catch (error: any) {
    console.error('Instagram publish cron error:', error);
    return NextResponse.json({
      error: error.message,
      results,
    }, { status: 500 });
  }
}

// Helper: Format caption with or without hashtags
function formatCaption(post: ScheduledPost): string {
  let caption = post.caption;
  
  // Add hashtags to caption if not posting as comment
  if (!post.hashtags_as_comment && post.hashtags?.length > 0) {
    const hashtagText = post.hashtags.map(h => `#${h}`).join(' ');
    caption = `${caption}\n\n${hashtagText}`;
  }
  
  return caption;
}

// Helper: Mark post as failed
async function markPostFailed(supabase: any, postId: string, errorMessage: string) {
  await supabase
    .from('instagram_scheduled_posts')
    .update({
      status: 'failed',
      error_message: errorMessage,
      failed_at: new Date().toISOString(),
    })
    .eq('id', postId);
}
```

### 2. Add Missing Instagram Client Methods (if needed)

**Check/Update:** `/src/lib/integrations/instagram/client.ts`

Ensure these methods exist:

```typescript
export class InstagramClient {
  private accessToken: string;
  private instagramUserId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(options: { accessToken: string; instagramUserId: string }) {
    this.accessToken = options.accessToken;
    this.instagramUserId = options.instagramUserId;
  }

  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me?access_token=${this.accessToken}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async createImageContainer(options: {
    imageUrl: string;
    caption?: string;
    isCarouselItem?: boolean;
    productTags?: string[];
  }): Promise<string> {
    const params = new URLSearchParams({
      image_url: options.imageUrl,
      access_token: this.accessToken,
    });

    if (options.caption && !options.isCarouselItem) {
      params.set('caption', options.caption);
    }
    
    if (options.isCarouselItem) {
      params.set('is_carousel_item', 'true');
    }

    const response = await fetch(
      `${this.baseUrl}/${this.instagramUserId}/media?${params}`,
      { method: 'POST' }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
  }

  async createVideoContainer(options: {
    videoUrl: string;
    caption?: string;
    coverUrl?: string;
    shareToFeed?: boolean;
  }): Promise<string> {
    const params = new URLSearchParams({
      media_type: 'REELS',
      video_url: options.videoUrl,
      access_token: this.accessToken,
    });

    if (options.caption) params.set('caption', options.caption);
    if (options.coverUrl) params.set('cover_url', options.coverUrl);
    if (options.shareToFeed) params.set('share_to_feed', 'true');

    const response = await fetch(
      `${this.baseUrl}/${this.instagramUserId}/media?${params}`,
      { method: 'POST' }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    // Wait for video processing
    await this.waitForMediaProcessing(data.id);
    return data.id;
  }

  async createCarouselContainer(options: {
    children: string[];
    caption?: string;
  }): Promise<string> {
    const params = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: options.children.join(','),
      access_token: this.accessToken,
    });

    if (options.caption) params.set('caption', options.caption);

    const response = await fetch(
      `${this.baseUrl}/${this.instagramUserId}/media?${params}`,
      { method: 'POST' }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
  }

  async createStoryContainer(options: { imageUrl: string }): Promise<string> {
    const params = new URLSearchParams({
      image_url: options.imageUrl,
      media_type: 'STORIES',
      access_token: this.accessToken,
    });

    const response = await fetch(
      `${this.baseUrl}/${this.instagramUserId}/media?${params}`,
      { method: 'POST' }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
  }

  async publishContainer(containerId: string): Promise<string> {
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: this.accessToken,
    });

    const response = await fetch(
      `${this.baseUrl}/${this.instagramUserId}/media_publish?${params}`,
      { method: 'POST' }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
  }

  async postComment(mediaId: string, text: string): Promise<string> {
    const params = new URLSearchParams({
      message: text,
      access_token: this.accessToken,
    });

    const response = await fetch(
      `${this.baseUrl}/${mediaId}/comments?${params}`,
      { method: 'POST' }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
  }

  private async waitForMediaProcessing(containerId: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `${this.baseUrl}/${containerId}?fields=status_code&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR') {
        throw new Error('Video processing failed');
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Video processing timed out');
  }
}
```

### 3. Add to Vercel Cron Configuration

**Update:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/instagram-publish",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Or if you prefer Vercel dashboard configuration, add via Project Settings → Cron Jobs.

### 4. Add Database Columns (if missing)

**Migration (if needed):**

```sql
-- Add columns to instagram_scheduled_posts if missing
ALTER TABLE instagram_scheduled_posts 
ADD COLUMN IF NOT EXISTS instagram_media_id TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create index for cron query
CREATE INDEX IF NOT EXISTS idx_instagram_posts_publish_queue 
ON instagram_scheduled_posts (status, scheduled_at) 
WHERE status = 'scheduled';
```

## Acceptance Criteria

- [ ] Cron runs every 5 minutes
- [ ] Finds posts where status='scheduled' and scheduled_at <= now
- [ ] Publishes feed posts with caption and optional hashtags
- [ ] Publishes reels with video processing wait
- [ ] Publishes carousels with multiple images
- [ ] Publishes stories
- [ ] Posts hashtags as first comment when configured
- [ ] Updates status to 'published' with instagram_media_id on success
- [ ] Updates status to 'failed' with error_message on failure
- [ ] Logs activity for published and failed posts
- [ ] Handles expired tokens gracefully
- [ ] Processes max 10 posts per run to avoid timeout

## Testing

### Manual Test (Development)

```bash
curl http://localhost:3000/api/cron/instagram-publish
```

### End-to-End Test

1. Connect Instagram account in Settings → Instagram
2. Create a new post via Instagram → Calendar → New Post
3. Schedule for 1 minute from now
4. Wait for cron to run (or trigger manually)
5. Check post status changed to 'published'
6. Verify post appears on Instagram
7. Check activity log for 'instagram_post_published' entry

### Failure Test

1. Disconnect Instagram (or invalidate token)
2. Schedule a post
3. Trigger cron
4. Verify post status is 'failed' with error message
5. Check activity log for 'instagram_post_failed' entry

## Rate Limiting Notes

Instagram API limits:
- 25 posts per 24 hours per account
- 200 API calls per hour

The cron should:
- Track daily post count in `instagram_connections` or separate table
- Skip publishing if limit reached
- Alert user when approaching limit

Consider adding rate limit check:

```typescript
// Before publishing, check daily limit
const { data: todayPosts } = await supabase
  .from('instagram_scheduled_posts')
  .select('id', { count: 'exact' })
  .eq('user_id', userId)
  .eq('status', 'published')
  .gte('published_at', startOfDay);

if ((todayPosts?.length || 0) >= 25) {
  await markPostFailed(supabase, post.id, 'Daily posting limit reached (25/day)');
  continue;
}
```
