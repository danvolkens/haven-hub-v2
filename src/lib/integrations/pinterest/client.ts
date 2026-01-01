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
    // Pinterest API expects an array of campaigns with ad_account_id in each item
    const response = await this.request<{ items: Array<{ data: PinterestCampaign }> }>(
      `/ad_accounts/${adAccountId}/campaigns`,
      {
        method: 'POST',
        body: JSON.stringify([{ ...campaign, ad_account_id: adAccountId }]),
      }
    );
    // Return the first campaign from the response
    return response.items[0].data;
  }

  async updateAdCampaign(
    adAccountId: string,
    campaign: { campaign_id: string; daily_spend_cap?: number; status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }
  ): Promise<PinterestCampaign> {
    return this.request(`/ad_accounts/${adAccountId}/campaigns`, {
      method: 'PATCH',
      body: JSON.stringify({
        items: [campaign]
      }),
    });
  }

  // Ad Groups
  async createAdGroup(
    adAccountId: string,
    adGroup: CreateAdGroupRequest
  ): Promise<PinterestAdGroup> {
    // Pinterest API expects an array of ad groups with ad_account_id in each item
    const response = await this.request<{ items: Array<{ data: PinterestAdGroup }> }>(
      `/ad_accounts/${adAccountId}/ad_groups`,
      {
        method: 'POST',
        body: JSON.stringify([{ ...adGroup, ad_account_id: adAccountId }]),
      }
    );
    return response.items[0].data;
  }

  async updateAdGroup(
    adAccountId: string,
    adGroup: { ad_group_id: string; status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }
  ): Promise<PinterestAdGroup> {
    return this.request(`/ad_accounts/${adAccountId}/ad_groups`, {
      method: 'PATCH',
      body: JSON.stringify({
        items: [adGroup]
      }),
    });
  }

  async getAdGroups(
    adAccountId: string,
    campaignIds?: string[]
  ): Promise<PinterestPagedResponse<PinterestAdGroup>> {
    const query = new URLSearchParams();
    if (campaignIds?.length) {
      query.set('campaign_ids', campaignIds.join(','));
    }
    const queryString = query.toString();
    return this.request(`/ad_accounts/${adAccountId}/ad_groups${queryString ? `?${queryString}` : ''}`);
  }

  // Promoted Pins (Ads)
  async createAd(
    adAccountId: string,
    ad: CreateAdRequest
  ): Promise<PinterestAd> {
    // Pinterest API expects an array of ads with ad_account_id in each item
    const response = await this.request<{ items: Array<{ data: PinterestAd }> }>(
      `/ad_accounts/${adAccountId}/ads`,
      {
        method: 'POST',
        body: JSON.stringify([{ ...ad, ad_account_id: adAccountId }]),
      }
    );
    return response.items[0].data;
  }

  async updateAd(
    adAccountId: string,
    ad: { ad_id: string; status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }
  ): Promise<PinterestAd> {
    return this.request(`/ad_accounts/${adAccountId}/ads`, {
      method: 'PATCH',
      body: JSON.stringify({
        items: [ad]
      }),
    });
  }

  async getAds(
    adAccountId: string,
    adGroupIds?: string[]
  ): Promise<PinterestPagedResponse<PinterestAd>> {
    const query = new URLSearchParams();
    if (adGroupIds?.length) {
      query.set('ad_group_ids', adGroupIds.join(','));
    }
    const queryString = query.toString();
    return this.request(`/ad_accounts/${adAccountId}/ads${queryString ? `?${queryString}` : ''}`);
  }

  // Audiences
  async getAudiences(
    adAccountId: string
  ): Promise<PinterestPagedResponse<PinterestAudience>> {
    return this.request(`/ad_accounts/${adAccountId}/audiences`);
  }

  // Ad Account Analytics - Get spend data
  async getAdAccountAnalytics(
    adAccountId: string,
    params: {
      start_date: string;
      end_date: string;
      granularity?: 'TOTAL' | 'DAY' | 'HOUR' | 'WEEK' | 'MONTH';
      columns?: string[];
    }
  ): Promise<PinterestAdAccountAnalytics[]> {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      granularity: params.granularity || 'TOTAL',
      columns: (params.columns || ['SPEND_IN_MICRO_DOLLAR', 'TOTAL_IMPRESSION', 'TOTAL_CLICKTHROUGH']).join(','),
    });
    return this.request(`/ad_accounts/${adAccountId}/analytics?${query}`);
  }

  // Helper to get spend summary for an ad account
  async getAdAccountSpendSummary(adAccountId: string): Promise<{
    totalSpend: number;
    weekSpend: number;
    monthSpend: number;
    impressions: number;
    clicks: number;
  }> {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Calculate date ranges
    const endDate = formatDate(today);

    // Start of current week (Sunday)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartDate = formatDate(weekStart);

    // Start of current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartDate = formatDate(monthStart);

    // Last 90 days for total (Pinterest limits date range)
    const totalStart = new Date(today);
    totalStart.setDate(today.getDate() - 90);
    const totalStartDate = formatDate(totalStart);

    try {
      // Fetch all three ranges in parallel
      const [totalData, weekData, monthData] = await Promise.all([
        this.getAdAccountAnalytics(adAccountId, {
          start_date: totalStartDate,
          end_date: endDate,
          granularity: 'TOTAL',
          columns: ['SPEND_IN_MICRO_DOLLAR', 'TOTAL_IMPRESSION', 'TOTAL_CLICKTHROUGH'],
        }).catch(() => []),
        this.getAdAccountAnalytics(adAccountId, {
          start_date: weekStartDate,
          end_date: endDate,
          granularity: 'TOTAL',
          columns: ['SPEND_IN_MICRO_DOLLAR'],
        }).catch(() => []),
        this.getAdAccountAnalytics(adAccountId, {
          start_date: monthStartDate,
          end_date: endDate,
          granularity: 'TOTAL',
          columns: ['SPEND_IN_MICRO_DOLLAR'],
        }).catch(() => []),
      ]);

      // Pinterest returns spend in micro dollars (1/1,000,000 of a dollar)
      const microToUsd = (micro: number) => micro / 1_000_000;

      const totalRow = totalData[0] || {};
      const weekRow = weekData[0] || {};
      const monthRow = monthData[0] || {};

      return {
        totalSpend: microToUsd(totalRow.SPEND_IN_MICRO_DOLLAR || 0),
        weekSpend: microToUsd(weekRow.SPEND_IN_MICRO_DOLLAR || 0),
        monthSpend: microToUsd(monthRow.SPEND_IN_MICRO_DOLLAR || 0),
        impressions: totalRow.TOTAL_IMPRESSION || 0,
        clicks: totalRow.TOTAL_CLICKTHROUGH || 0,
      };
    } catch (error) {
      console.error(`Error fetching spend for ad account ${adAccountId}:`, error);
      return {
        totalSpend: 0,
        weekSpend: 0,
        monthSpend: 0,
        impressions: 0,
        clicks: 0,
      };
    }
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

export interface UpdateCampaignRequest {
  ad_account_id: string;
  campaign_id: string;
  daily_spend_cap?: number;
  status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
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

export interface PinterestAdGroup {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  campaign_id: string;
  billable_event: string;
  bid_in_micro_currency?: number;
  budget_in_micro_currency?: number;
  budget_type?: 'DAILY' | 'LIFETIME' | 'CBO_ADGROUP';
  targeting_spec?: Record<string, any>;
  auto_targeting_enabled?: boolean;
}

export interface CreateAdGroupRequest {
  name: string;
  campaign_id: string;
  status?: 'ACTIVE' | 'PAUSED';
  billable_event?: 'CLICKTHROUGH' | 'IMPRESSION' | 'VIDEO_V_50_MRC';
  bid_in_micro_currency?: number;
  budget_in_micro_currency?: number;
  budget_type?: 'DAILY' | 'LIFETIME' | 'CBO_ADGROUP';
  targeting_spec?: Record<string, any>;
  auto_targeting_enabled?: boolean;
}

export interface PinterestAd {
  id: string;
  ad_group_id: string;
  pin_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT' | 'DELETED_DRAFT';
  creative_type: string;
  destination_url?: string;
  tracking_urls?: Record<string, string>;
}

export interface CreateAdRequest {
  ad_group_id: string;
  pin_id: string;
  status?: 'ACTIVE' | 'PAUSED';
  creative_type: 'REGULAR' | 'VIDEO' | 'SHOPPING' | 'CAROUSEL' | 'MAX_VIDEO' | 'SHOP_THE_PIN' | 'COLLECTION' | 'IDEA';
  destination_url?: string;
  tracking_urls?: Record<string, string>;
}

export interface PinterestAudience {
  id: string;
  name: string;
  audience_type: 'VISITOR' | 'ENGAGEMENT' | 'CUSTOMER_LIST' | 'ACTALIKE';
  description?: string;
  size?: number;
  status: string;
}

export interface PinterestAdAccountAnalytics {
  DATE?: string;
  SPEND_IN_MICRO_DOLLAR?: number;
  TOTAL_IMPRESSION?: number;
  TOTAL_CLICKTHROUGH?: number;
  TOTAL_ENGAGEMENT?: number;
  TOTAL_SAVE?: number;
  TOTAL_PIN_CLICK?: number;
  TOTAL_OUTBOUND_CLICK?: number;
  [key: string]: string | number | undefined;
}
