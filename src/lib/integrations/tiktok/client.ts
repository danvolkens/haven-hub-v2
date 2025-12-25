import { getTikTokApiUrl } from './config';

interface TikTokClientOptions {
  accessToken: string;
}

export class TikTokClient {
  private accessToken: string;
  private baseUrl: string;

  constructor({ accessToken }: TikTokClientOptions) {
    this.accessToken = accessToken;
    this.baseUrl = getTikTokApiUrl();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `TikTok API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get user profile information
   */
  async getUserInfo(): Promise<TikTokUserInfo> {
    const response = await this.request<TikTokApiResponse<{ user: TikTokUserInfo }>>('/user/info/', {
      method: 'GET',
    });
    return response.data.user;
  }

  /**
   * Get list of user's videos
   */
  async getVideos(params?: {
    cursor?: number;
    max_count?: number;
  }): Promise<TikTokVideoListResponse> {
    const body: Record<string, unknown> = {
      max_count: params?.max_count || 20,
    };
    if (params?.cursor) {
      body.cursor = params.cursor;
    }

    return this.request<TikTokVideoListResponse>('/video/list/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get video insights/analytics
   */
  async getVideoInsights(videoIds: string[]): Promise<TikTokVideoInsightsResponse> {
    return this.request<TikTokVideoInsightsResponse>('/video/query/', {
      method: 'POST',
      body: JSON.stringify({
        filters: {
          video_ids: videoIds,
        },
        fields: [
          'id',
          'title',
          'video_description',
          'duration',
          'cover_image_url',
          'share_url',
          'view_count',
          'like_count',
          'comment_count',
          'share_count',
          'create_time',
        ],
      }),
    });
  }
}

// Types
export interface TikTokApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface TikTokUserInfo {
  open_id: string;
  union_id?: string;
  avatar_url: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokVideo {
  id: string;
  title?: string;
  video_description?: string;
  duration: number;
  cover_image_url: string;
  share_url: string;
  embed_link?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  create_time: number;
}

export interface TikTokVideoListResponse {
  data: {
    videos: TikTokVideo[];
    cursor?: number;
    has_more: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TikTokVideoInsightsResponse {
  data: {
    videos: TikTokVideo[];
  };
  error?: {
    code: string;
    message: string;
  };
}
