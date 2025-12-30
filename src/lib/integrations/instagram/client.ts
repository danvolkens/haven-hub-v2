import { getInstagramApiUrl } from './config';

interface InstagramClientOptions {
  accessToken: string;
  instagramAccountId?: string;
}

export class InstagramClient {
  private accessToken: string;
  private baseUrl: string;
  private accountId?: string;

  constructor({ accessToken, instagramAccountId }: InstagramClientOptions) {
    this.accessToken = accessToken;
    this.baseUrl = getInstagramApiUrl();
    this.accountId = instagramAccountId;
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('access_token', this.accessToken);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Instagram API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get connected Facebook Pages that have Instagram accounts
   */
  async getPages(): Promise<InstagramPage[]> {
    // First check what permissions the token has
    try {
      const debugUrl = `${this.baseUrl}/me/permissions?access_token=${this.accessToken}`;
      const debugRes = await fetch(debugUrl);
      const debugData = await debugRes.json();
      console.log('Token permissions:', JSON.stringify(debugData));
    } catch (e) {
      console.log('Failed to get permissions:', e);
    }

    const response = await this.request<InstagramPagesResponse>('/me/accounts', {
      fields: 'id,name,instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}',
    });
    console.log('Pages API raw response:', JSON.stringify(response));
    return response.data || [];
  }

  /**
   * Get Instagram Business Account info
   */
  async getAccountInfo(accountId?: string): Promise<InstagramAccount> {
    const id = accountId || this.accountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request<InstagramAccount>(`/${id}`, {
      fields: 'id,name,username,profile_picture_url,followers_count,follows_count,media_count,biography,website',
    });
  }

  /**
   * Get media (posts) for an Instagram account
   */
  async getMedia(params?: {
    accountId?: string;
    limit?: number;
    after?: string;
  }): Promise<InstagramMediaResponse> {
    const id = params?.accountId || this.accountId;
    if (!id) throw new Error('Instagram account ID is required');

    const queryParams: Record<string, string> = {
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: String(params?.limit || 25),
    };
    if (params?.after) {
      queryParams.after = params.after;
    }

    return this.request<InstagramMediaResponse>(`/${id}/media`, queryParams);
  }

  /**
   * Get insights for a specific media post
   */
  async getMediaInsights(mediaId: string, mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'): Promise<InstagramInsights> {
    // Different metrics available for different media types
    let metrics: string[];
    if (mediaType === 'VIDEO' || mediaType === 'REELS') {
      metrics = ['impressions', 'reach', 'saved', 'video_views', 'shares', 'plays', 'total_interactions'];
    } else if (mediaType === 'CAROUSEL_ALBUM') {
      metrics = ['impressions', 'reach', 'saved', 'carousel_album_engagement', 'carousel_album_impressions', 'carousel_album_reach'];
    } else {
      metrics = ['impressions', 'reach', 'saved', 'total_interactions'];
    }

    return this.request<InstagramInsights>(`/${mediaId}/insights`, {
      metric: metrics.join(','),
    });
  }

  /**
   * Get account-level insights
   */
  async getAccountInsights(params: {
    accountId?: string;
    period: 'day' | 'week' | 'days_28' | 'lifetime';
    since?: string;
    until?: string;
  }): Promise<InstagramInsights> {
    const id = params.accountId || this.accountId;
    if (!id) throw new Error('Instagram account ID is required');

    const metrics = ['impressions', 'reach', 'follower_count', 'profile_views', 'website_clicks'];
    const queryParams: Record<string, string> = {
      metric: metrics.join(','),
      period: params.period,
    };
    if (params.since) queryParams.since = params.since;
    if (params.until) queryParams.until = params.until;

    return this.request<InstagramInsights>(`/${id}/insights`, queryParams);
  }
}

// Types
export interface InstagramPage {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
    name: string;
    username: string;
    profile_picture_url: string;
    followers_count: number;
    media_count: number;
  };
}

export interface InstagramPagesResponse {
  data: InstagramPage[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface InstagramAccount {
  id: string;
  name: string;
  username: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  biography?: string;
  website?: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

export interface InstagramMediaResponse {
  data: InstagramMedia[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface InstagramInsightValue {
  value: number;
  end_time?: string;
}

export interface InstagramInsight {
  name: string;
  period: string;
  values: InstagramInsightValue[];
  title: string;
  description: string;
  id: string;
}

export interface InstagramInsights {
  data: InstagramInsight[];
}
