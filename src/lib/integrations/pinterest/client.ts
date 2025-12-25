import { getPinterestApiUrl } from './config';

interface PinterestClientOptions {
  accessToken: string;
}

export class PinterestClient {
  private accessToken: string;
  private baseUrl: string;

  constructor({ accessToken }: PinterestClientOptions) {
    this.accessToken = accessToken;
    this.baseUrl = getPinterestApiUrl();
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
      throw new Error(error.message || `Pinterest API error: ${response.status}`);
    }

    return response.json();
  }

  // User account
  async getUserAccount(): Promise<PinterestUser> {
    return this.request('/user_account');
  }

  // Boards
  async getBoards(params?: { page_size?: number; bookmark?: string }): Promise<PinterestPagedResponse<PinterestBoard>> {
    const query = new URLSearchParams();
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.bookmark) query.set('bookmark', params.bookmark);
    const queryString = query.toString();
    return this.request(`/boards${queryString ? `?${queryString}` : ''}`);
  }

  async createBoard(board: CreateBoardRequest): Promise<PinterestBoard> {
    return this.request('/boards', {
      method: 'POST',
      body: JSON.stringify(board),
    });
  }

  // Pins
  async createPin(pin: CreatePinRequest): Promise<PinterestPin> {
    return this.request('/pins', {
      method: 'POST',
      body: JSON.stringify(pin),
    });
  }

  async getPin(pinId: string): Promise<PinterestPin> {
    return this.request(`/pins/${pinId}`);
  }

  async deletePin(pinId: string): Promise<void> {
    await this.request(`/pins/${pinId}`, { method: 'DELETE' });
  }

  // Analytics
  async getPinAnalytics(
    pinId: string,
    params: {
      start_date: string;
      end_date: string;
      metric_types: string[];
    }
  ): Promise<PinterestPinAnalytics> {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      metric_types: params.metric_types.join(','),
    });
    return this.request(`/pins/${pinId}/analytics?${query}`);
  }

  async getUserAccountAnalytics(params: {
    start_date: string;
    end_date: string;
    metric_types: string[];
  }): Promise<PinterestAccountAnalytics> {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      metric_types: params.metric_types.join(','),
    });
    return this.request(`/user_account/analytics?${query}`);
  }

  // Ads
  async getAdAccounts(): Promise<PinterestPagedResponse<PinterestAdAccount>> {
    return this.request('/ad_accounts');
  }

  async createAdCampaign(
    adAccountId: string,
    campaign: CreateCampaignRequest
  ): Promise<PinterestCampaign> {
    return this.request(`/ad_accounts/${adAccountId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(campaign),
    });
  }
}

// Types
export interface PinterestUser {
  account_type: string;
  profile_image: string;
  website_url: string;
  username: string;
  business_name: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
  pin_count: number;
  follower_count: number;
}

export interface PinterestPin {
  id: string;
  created_at: string;
  link: string;
  title: string;
  description: string;
  board_id: string;
  media: {
    media_type: 'image' | 'video';
    source: {
      source_type: string;
      url: string;
    };
  };
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
  privacy?: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

export interface CreatePinRequest {
  board_id: string;
  media_source: {
    source_type: 'image_url';
    url: string;
  };
  title?: string;
  description?: string;
  link?: string;
  alt_text?: string;
}

export interface PinterestPinAnalytics {
  all_time: {
    impressions: number;
    saves: number;
    clicks: number;
  };
  daily_metrics: Array<{
    date: string;
    data_status: string;
    metrics: {
      IMPRESSION: number;
      SAVE: number;
      PIN_CLICK: number;
      OUTBOUND_CLICK: number;
    };
  }>;
}

export interface PinterestAccountAnalytics {
  all_time: {
    impressions: number;
    engagements: number;
  };
}

export interface PinterestAdAccount {
  id: string;
  name: string;
  currency: string;
  status: string;
}

export interface PinterestCampaign {
  id: string;
  name: string;
  status: string;
  lifetime_spend_cap: number;
  daily_spend_cap: number;
}

export interface CreateCampaignRequest {
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  lifetime_spend_cap?: number;
  daily_spend_cap?: number;
  objective_type: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSIONS';
}

export interface PinterestPagedResponse<T> {
  items: T[];
  bookmark?: string;
}
