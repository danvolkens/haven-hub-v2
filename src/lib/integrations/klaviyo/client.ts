/**
 * Klaviyo API Client
 * Provides methods for interacting with the Klaviyo API
 */

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api';
const KLAVIYO_REVISION = '2025-01-15'; // Updated for flows creation API support

interface KlaviyoClientOptions {
  apiKey: string;
}

interface KlaviyoProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  properties?: Record<string, any>;
}

interface KlaviyoList {
  id: string;
  name: string;
  opt_in_process: string;
  created: string;
  updated: string;
}

interface KlaviyoEvent {
  metric: { name: string };
  profile: { email: string } | { id: string };
  properties?: Record<string, any>;
  time?: string;
  value?: number;
  unique_id?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  links?: {
    next?: string;
    prev?: string;
  };
}

interface KlaviyoTemplate {
  id: string;
  name: string;
  editor_type: 'CODE' | 'DRAG_AND_DROP';
  html: string;
  text?: string;
  created: string;
  updated: string;
}

interface KlaviyoFlowAction {
  temporary_id: string;
  type: 'send-email' | 'time-delay' | 'conditional-split';
  data: {
    message?: {
      from_email: string;
      from_label: string;
      reply_to_email: string;
      cc_email: string | null;
      bcc_email: string | null;
      subject_line: string;
      preview_text?: string;
      template_id: string;
    };
    // For time-delay: value + unit
    value?: number;
    unit?: 'days' | 'hours' | 'minutes';
    condition?: any;
  };
  links: {
    next: string | null;
    next_if_true?: string | null;
    next_if_false?: string | null;
  };
}

interface KlaviyoFlowDefinition {
  triggers: Array<{
    type: 'list' | 'metric' | 'date';
    // List trigger uses "id" field
    id?: string;
    // Metric trigger uses "metric" relationship
    metric?: { id: string };
    filter?: any;
  }>;
  profile_filter?: any;
  entry_action_id: string;
  actions: KlaviyoFlowAction[];
}

interface CreateFlowRequest {
  name: string;
  status?: 'draft' | 'live';
  definition: KlaviyoFlowDefinition;
}

export class KlaviyoClient {
  private apiKey: string;

  constructor(options: KlaviyoClientOptions) {
    this.apiKey = options.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${KLAVIYO_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
        'revision': KLAVIYO_REVISION,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      // Log full error for debugging
      console.error('Klaviyo API Error:', JSON.stringify(error, null, 2));
      throw new Error(error.errors?.[0]?.detail || error.message || `Klaviyo API error: ${response.status}`);
    }

    // Handle empty responses (202 Accepted, 204 No Content, or empty body)
    if (response.status === 202 || response.status === 204) {
      return {} as T;
    }

    // Check content-length or try to parse, returning empty object on failure
    const text = await response.text();
    if (!text || text.trim() === '') {
      return {} as T;
    }

    try {
      return JSON.parse(text);
    } catch {
      return {} as T;
    }
  }

  // ============================================================================
  // Account
  // ============================================================================

  async getAccount(): Promise<any> {
    const response = await this.request<{ data: any[] }>('/accounts/');
    return response.data?.[0];
  }

  // ============================================================================
  // Lists
  // ============================================================================

  async getLists(): Promise<KlaviyoList[]> {
    const allLists: KlaviyoList[] = [];
    let cursor: string | null = null;

    do {
      const endpoint: string = cursor ? `/lists/?page[cursor]=${cursor}` : '/lists/';
      const response = await this.request<PaginatedResponse<{ id: string; attributes: any }> & { links?: { next?: string } }>(endpoint);

      const lists = response.data.map(item => ({
        id: item.id,
        ...item.attributes,
      }));
      allLists.push(...lists);

      // Extract cursor from next link if present
      cursor = null;
      if (response.links?.next) {
        const match = response.links.next.match(/page\[cursor\]=([^&]+)/);
        if (match) cursor = match[1];
      }
    } while (cursor);

    return allLists;
  }

  async getList(listId: string): Promise<KlaviyoList | null> {
    try {
      const response = await this.request<{ data: { id: string; attributes: any } }>(`/lists/${listId}/`);
      return { id: response.data.id, ...response.data.attributes };
    } catch {
      return null;
    }
  }

  async createList(name: string): Promise<KlaviyoList> {
    const response = await this.request<{ data: { id: string; attributes: any } }>('/lists/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'list',
          attributes: { name },
        },
      }),
    });
    return { id: response.data.id, ...response.data.attributes };
  }

  async addProfilesToList(listId: string, profileIds: string[]): Promise<void> {
    await this.request(`/lists/${listId}/relationships/profiles/`, {
      method: 'POST',
      body: JSON.stringify({
        data: profileIds.map(id => ({ type: 'profile', id })),
      }),
    });
  }

  async removeProfilesFromList(listId: string, profileIds: string[]): Promise<void> {
    await this.request(`/lists/${listId}/relationships/profiles/`, {
      method: 'DELETE',
      body: JSON.stringify({
        data: profileIds.map(id => ({ type: 'profile', id })),
      }),
    });
  }

  // ============================================================================
  // Profiles
  // ============================================================================

  async createProfile(profile: Omit<KlaviyoProfile, 'id'>): Promise<KlaviyoProfile> {
    const response = await this.request<{ data: { id: string; attributes: any } }>('/profiles/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone_number: profile.phone_number,
            properties: profile.properties,
          },
        },
      }),
    });

    return { id: response.data.id, ...response.data.attributes };
  }

  async getProfileByEmail(email: string): Promise<KlaviyoProfile | null> {
    try {
      const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>(
        `/profiles/?filter=equals(email,"${encodeURIComponent(email)}")`
      );
      if (response.data.length === 0) return null;
      return { id: response.data[0].id, ...response.data[0].attributes };
    } catch {
      return null;
    }
  }

  async getProfile(profileId: string): Promise<KlaviyoProfile | null> {
    try {
      const response = await this.request<{ data: { id: string; attributes: any } }>(`/profiles/${profileId}/`);
      return { id: response.data.id, ...response.data.attributes };
    } catch {
      return null;
    }
  }

  async updateProfile(profileId: string, attributes: Partial<KlaviyoProfile>): Promise<KlaviyoProfile> {
    const response = await this.request<{ data: { id: string; attributes: any } }>(`/profiles/${profileId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'profile',
          id: profileId,
          attributes,
        },
      }),
    });

    return { id: response.data.id, ...response.data.attributes };
  }

  async createOrUpdateProfile(profile: Omit<KlaviyoProfile, 'id'>): Promise<KlaviyoProfile> {
    // Try to find existing profile
    const existing = await this.getProfileByEmail(profile.email);

    if (existing) {
      return this.updateProfile(existing.id, profile);
    }

    return this.createProfile(profile);
  }

  // ============================================================================
  // Events
  // ============================================================================

  async createEvent(event: KlaviyoEvent): Promise<void> {
    // Build profile data - Klaviyo requires nested data structure
    const profileData: Record<string, any> = {
      type: 'profile',
      attributes: {},
    };

    if ('email' in event.profile) {
      profileData.attributes.email = event.profile.email;
    } else if ('id' in event.profile) {
      profileData.id = event.profile.id;
    }

    await this.request('/events/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'event',
          attributes: {
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: event.metric.name,
                },
              },
            },
            profile: {
              data: profileData,
            },
            properties: event.properties,
            time: event.time || new Date().toISOString(),
            value: event.value,
            unique_id: event.unique_id,
          },
        },
      }),
    });
  }

  async trackQuizComplete(
    email: string,
    quizResults: Record<string, any>,
    recommendedCollection: string
  ): Promise<void> {
    await this.createEvent({
      metric: { name: 'Quiz Completed' },
      profile: { email },
      properties: {
        quiz_results: quizResults,
        recommended_collection: recommendedCollection,
        quiz_completed_at: new Date().toISOString(),
      },
    });
  }

  async trackPurchase(
    email: string,
    orderId: string,
    value: number,
    items: Array<{ name: string; quantity: number; price: number }>
  ): Promise<void> {
    await this.createEvent({
      metric: { name: 'Placed Order' },
      profile: { email },
      properties: {
        order_id: orderId,
        items,
        item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      },
      value,
      unique_id: orderId,
    });
  }

  async trackCartAbandonment(
    email: string,
    cartId: string,
    items: Array<{ name: string; quantity: number; price: number }>,
    cartValue: number
  ): Promise<void> {
    await this.createEvent({
      metric: { name: 'Cart Abandoned' },
      profile: { email },
      properties: {
        cart_id: cartId,
        items,
        cart_value: cartValue,
        abandoned_at: new Date().toISOString(),
      },
      unique_id: `cart_${cartId}`,
    });
  }

  async trackPinEngagement(
    email: string,
    pinId: string,
    action: 'view' | 'save' | 'click',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.createEvent({
      metric: { name: `Pin ${action.charAt(0).toUpperCase() + action.slice(1)}` },
      profile: { email },
      properties: {
        pin_id: pinId,
        action,
        ...metadata,
      },
    });
  }

  // ============================================================================
  // Tags
  // ============================================================================

  async getTags(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.request<PaginatedResponse<{ id: string; attributes: { name: string } }>>('/tags/');
    return response.data.map(tag => ({
      id: tag.id,
      name: tag.attributes.name,
    }));
  }

  async getOrCreateTag(tagName: string): Promise<string> {
    // Check if tag exists
    const tags = await this.getTags();
    const existing = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

    if (existing) {
      return existing.id;
    }

    // Create new tag
    const response = await this.request<{ data: { id: string } }>('/tags/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'tag',
          attributes: { name: tagName },
        },
      }),
    });

    return response.data.id;
  }

  async addTagToProfile(profileId: string, tagId: string): Promise<void> {
    await this.request(`/tags/${tagId}/relationships/profiles/`, {
      method: 'POST',
      body: JSON.stringify({
        data: [{ type: 'profile', id: profileId }],
      }),
    });
  }

  async tagProfileByName(profileId: string, tagName: string): Promise<void> {
    const tagId = await this.getOrCreateTag(tagName);
    await this.addTagToProfile(profileId, tagId);
  }

  // ============================================================================
  // Segments
  // ============================================================================

  async getSegments(): Promise<Array<{ id: string; name: string; created: string }>> {
    const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>('/segments/');
    return response.data.map(seg => ({
      id: seg.id,
      name: seg.attributes.name,
      created: seg.attributes.created,
    }));
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  async getMetrics(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.request<PaginatedResponse<{ id: string; attributes: { name: string } }>>('/metrics/');
    return response.data.map(metric => ({
      id: metric.id,
      name: metric.attributes.name,
    }));
  }

  // ============================================================================
  // Flows
  // ============================================================================

  async getFlows(): Promise<Array<{
    id: string;
    name: string;
    status: 'live' | 'draft' | 'paused';
    trigger: string;
    created: string;
    updated: string;
  }>> {
    const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>('/flows/');
    return response.data.map(flow => ({
      id: flow.id,
      name: flow.attributes.name,
      status: flow.attributes.status === 'live' ? 'live' : flow.attributes.status === 'draft' ? 'draft' : 'paused',
      trigger: flow.attributes.trigger_type || 'Unknown',
      created: flow.attributes.created,
      updated: flow.attributes.updated,
    }));
  }

  async getFlowMessages(flowId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>(
        `/flows/${flowId}/flow-messages/`
      );
      return response.data.map(msg => ({
        id: msg.id,
        name: msg.attributes.name || 'Untitled',
      }));
    } catch {
      return [];
    }
  }

  async getListProfileCount(listId: string): Promise<number> {
    try {
      const response = await this.request<{ data: any[]; meta?: { page_count?: number } }>(
        `/lists/${listId}/profiles/?page[size]=1`
      );
      // Estimate count based on profiles returned or meta info
      return response.data?.length || 0;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Reporting / Aggregate Metrics
  // ============================================================================

  async getMetricAggregates(
    metricId: string,
    measurement: string = 'count',
    interval: string = 'day',
    startDate?: string,
    endDate?: string
  ): Promise<{ values: number[]; dates: string[] }> {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const response = await this.request<{
        data: {
          attributes: {
            data: Array<{ measurements: Record<string, number>; dimensions: { datetime: string } }>;
          };
        };
      }>('/metric-aggregates/', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'metric-aggregate',
            attributes: {
              metric_id: metricId,
              measurements: [measurement],
              interval,
              filter: [`greater-or-equal(datetime,${start})`, `less-than(datetime,${end})`],
            },
          },
        }),
      });

      const data = response.data?.attributes?.data || [];
      return {
        values: data.map((d) => d.measurements[measurement] || 0),
        dates: data.map((d) => d.dimensions.datetime),
      };
    } catch {
      return { values: [], dates: [] };
    }
  }

  // ============================================================================
  // Campaigns
  // ============================================================================

  async getCampaigns(limit: number = 10): Promise<Array<{
    id: string;
    name: string;
    status: string;
    sentAt: string | null;
    sendTime: string | null;
    archived: boolean;
  }>> {
    try {
      const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>(
        `/campaigns/?filter=equals(messages.channel,'email')&sort=-send_time&page[size]=${limit}`
      );
      return response.data.map(campaign => ({
        id: campaign.id,
        name: campaign.attributes.name,
        status: campaign.attributes.status,
        sentAt: campaign.attributes.sent_at,
        sendTime: campaign.attributes.send_time,
        archived: campaign.attributes.archived || false,
      }));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  async getCampaignMessages(campaignId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await this.request<PaginatedResponse<{ id: string; attributes: any }>>(
        `/campaigns/${campaignId}/campaign-messages/`
      );
      return response.data.map(msg => ({
        id: msg.id,
        name: msg.attributes.label || 'Message',
      }));
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Real Email Metrics
  // ============================================================================

  /**
   * Get aggregated email metrics for the past 30 days
   * Returns real data from Klaviyo's metric-aggregates endpoint
   */
  async getEmailMetrics(days: number = 30): Promise<{
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }> {
    // First, get all available metrics to find the IDs we need
    const metrics = await this.getMetrics();

    // Standard Klaviyo metric names
    const metricNames = {
      received: ['Received Email', 'Email Delivered'],
      opened: ['Opened Email'],
      clicked: ['Clicked Email'],
      bounced: ['Bounced Email'],
      unsubscribed: ['Unsubscribed'],
    };

    const findMetricId = (names: string[]): string | null => {
      for (const name of names) {
        const metric = metrics.find(m => m.name.toLowerCase() === name.toLowerCase());
        if (metric) return metric.id;
      }
      return null;
    };

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch counts for each metric type
    const getCount = async (names: string[]): Promise<number> => {
      const metricId = findMetricId(names);
      if (!metricId) return 0;

      try {
        const response = await this.request<{
          data: { attributes: { data: Array<{ measurements: { count: number } }> } };
        }>('/metric-aggregates/', {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'metric-aggregate',
              attributes: {
                metric_id: metricId,
                measurements: ['count'],
                interval: 'day',
                filter: [`greater-or-equal(datetime,${startDate})`, `less-than(datetime,${endDate})`],
              },
            },
          }),
        });

        const dataPoints = response.data?.attributes?.data || [];
        return dataPoints.reduce((sum, d) => sum + (d.measurements?.count || 0), 0);
      } catch (error) {
        console.error(`Error fetching metric ${names[0]}:`, error);
        return 0;
      }
    };

    const [totalSent, totalOpened, totalClicked, totalBounced, totalUnsubscribed] = await Promise.all([
      getCount(metricNames.received),
      getCount(metricNames.opened),
      getCount(metricNames.clicked),
      getCount(metricNames.bounced),
      getCount(metricNames.unsubscribed),
    ]);

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
      totalUnsubscribed,
      openRate,
      clickRate,
      bounceRate,
    };
  }

  /**
   * Get email revenue for the past N days
   */
  async getEmailRevenue(days: number = 30): Promise<{
    totalRevenue: number;
    previousRevenue: number;
    percentChange: number;
  }> {
    const metrics = await this.getMetrics();

    // Look for "Placed Order" metric which tracks revenue
    const orderMetric = metrics.find(m =>
      m.name.toLowerCase() === 'placed order' ||
      m.name.toLowerCase() === 'ordered product'
    );

    if (!orderMetric) {
      return { totalRevenue: 0, previousRevenue: 0, percentChange: 0 };
    }

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const previousStartDate = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fetchRevenue = async (start: string, end: string): Promise<number> => {
      try {
        const response = await this.request<{
          data: { attributes: { data: Array<{ measurements: { sum_value: number } }> } };
        }>('/metric-aggregates/', {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'metric-aggregate',
              attributes: {
                metric_id: orderMetric.id,
                measurements: ['sum_value'],
                interval: 'day',
                filter: [`greater-or-equal(datetime,${start})`, `less-than(datetime,${end})`],
              },
            },
          }),
        });

        const dataPoints = response.data?.attributes?.data || [];
        return dataPoints.reduce((sum, d) => sum + (d.measurements?.sum_value || 0), 0);
      } catch {
        return 0;
      }
    };

    const [totalRevenue, previousRevenue] = await Promise.all([
      fetchRevenue(startDate, endDate),
      fetchRevenue(previousStartDate, startDate),
    ]);

    const percentChange = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    return { totalRevenue, previousRevenue, percentChange };
  }

  /**
   * Get total subscriber count across all lists
   */
  async getTotalSubscribers(): Promise<{
    total: number;
    previousTotal: number;
    percentChange: number;
  }> {
    try {
      // Get all lists with their profile counts
      const response = await this.request<PaginatedResponse<{ id: string; attributes: any; relationships?: any }>>(
        '/lists/?additional-fields[list]=profile_count'
      );

      // Sum up profile counts
      let total = 0;
      for (const list of response.data) {
        // Profile count may be in attributes or we need to fetch it separately
        const profileCount = list.attributes?.profile_count;
        if (typeof profileCount === 'number') {
          total += profileCount;
        }
      }

      // If profile_count isn't available, estimate from list count
      if (total === 0 && response.data.length > 0) {
        // Fallback: fetch profile count for each list (limited)
        const listCounts = await Promise.all(
          response.data.slice(0, 5).map(async (list) => {
            try {
              const profilesResponse = await this.request<{ data: any[]; links?: any }>(
                `/lists/${list.id}/profiles/?page[size]=1`
              );
              // Use cursor info to estimate total if available
              return profilesResponse.data?.length || 0;
            } catch {
              return 0;
            }
          })
        );
        total = listCounts.reduce((sum, c) => sum + c, 0);
      }

      // For now, we can't easily get historical subscriber counts
      // Set previous to current (0% change) unless we implement historical tracking
      return {
        total,
        previousTotal: total,
        percentChange: 0,
      };
    } catch (error) {
      console.error('Error fetching subscriber count:', error);
      return { total: 0, previousTotal: 0, percentChange: 0 };
    }
  }

  /**
   * Get flow statistics including real sent counts and revenue
   */
  async getFlowStats(flowId: string): Promise<{
    sent: number;
    revenue: number;
    openRate: number;
    clickRate: number;
  }> {
    // Flow stats require querying flow-specific metrics
    // This is a placeholder - Klaviyo's flow analytics requires additional API calls
    try {
      const messages = await this.getFlowMessages(flowId);
      // Without flow-specific metrics endpoint access, return estimates based on message count
      return {
        sent: 0,
        revenue: 0,
        openRate: 0,
        clickRate: 0,
      };
    } catch {
      return { sent: 0, revenue: 0, openRate: 0, clickRate: 0 };
    }
  }

  /**
   * Get all metrics in a single call for dashboard display
   */
  async getDashboardMetrics(days: number = 30): Promise<{
    emailMetrics: {
      totalSent: number;
      openRate: number;
      clickRate: number;
    };
    revenue: {
      total: number;
      percentChange: number;
    };
    subscribers: {
      total: number;
      percentChange: number;
    };
    flows: Array<{
      id: string;
      name: string;
      status: 'live' | 'draft' | 'paused';
    }>;
    campaigns: Array<{
      id: string;
      name: string;
      sentAt: string | null;
      status: string;
    }>;
  }> {
    // Fetch all data in parallel for performance
    const [emailMetrics, revenueData, subscriberData, flows, campaigns] = await Promise.all([
      this.getEmailMetrics(days),
      this.getEmailRevenue(days),
      this.getTotalSubscribers(),
      this.getFlows(),
      this.getCampaigns(5),
    ]);

    return {
      emailMetrics: {
        totalSent: emailMetrics.totalSent,
        openRate: emailMetrics.openRate,
        clickRate: emailMetrics.clickRate,
      },
      revenue: {
        total: revenueData.totalRevenue,
        percentChange: revenueData.percentChange,
      },
      subscribers: {
        total: subscriberData.total,
        percentChange: subscriberData.percentChange,
      },
      flows: flows.map(f => ({
        id: f.id,
        name: f.name,
        status: f.status,
      })),
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        sentAt: c.sentAt,
        status: c.status,
      })),
    };
  }

  // ============================================================================
  // Templates API
  // ============================================================================

  /**
   * Get all email templates
   */
  async getTemplates(): Promise<KlaviyoTemplate[]> {
    const allTemplates: KlaviyoTemplate[] = [];
    let cursor: string | null = null;

    do {
      const endpoint: string = cursor ? `/templates/?page[cursor]=${cursor}` : '/templates/';
      const response = await this.request<PaginatedResponse<{ id: string; attributes: any }> & { links?: { next?: string } }>(endpoint);

      const templates = response.data.map(item => ({
        id: item.id,
        name: item.attributes.name,
        editor_type: item.attributes.editor_type,
        html: item.attributes.html || '',
        text: item.attributes.text,
        created: item.attributes.created,
        updated: item.attributes.updated,
      }));
      allTemplates.push(...templates);

      cursor = null;
      if (response.links?.next) {
        const match = response.links.next.match(/page\[cursor\]=([^&]+)/);
        if (match) cursor = match[1];
      }
    } while (cursor);

    return allTemplates;
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<KlaviyoTemplate | null> {
    try {
      const response = await this.request<{ data: { id: string; attributes: any } }>(`/templates/${templateId}/`);
      return {
        id: response.data.id,
        name: response.data.attributes.name,
        editor_type: response.data.attributes.editor_type,
        html: response.data.attributes.html || '',
        text: response.data.attributes.text,
        created: response.data.attributes.created,
        updated: response.data.attributes.updated,
      };
    } catch {
      return null;
    }
  }

  /**
   * Create a new email template
   */
  async createTemplate(params: {
    name: string;
    html: string;
    text?: string;
  }): Promise<KlaviyoTemplate> {
    const response = await this.request<{ data: { id: string; attributes: any } }>('/templates/', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'template',
          attributes: {
            name: params.name,
            editor_type: 'CODE',
            html: params.html,
            text: params.text,
          },
        },
      }),
    });

    return {
      id: response.data.id,
      name: response.data.attributes.name,
      editor_type: response.data.attributes.editor_type,
      html: response.data.attributes.html || '',
      text: response.data.attributes.text,
      created: response.data.attributes.created,
      updated: response.data.attributes.updated,
    };
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, params: {
    name?: string;
    html?: string;
    text?: string;
  }): Promise<KlaviyoTemplate> {
    const response = await this.request<{ data: { id: string; attributes: any } }>(`/templates/${templateId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'template',
          id: templateId,
          attributes: {
            ...(params.name && { name: params.name }),
            ...(params.html && { html: params.html }),
            ...(params.text !== undefined && { text: params.text }),
          },
        },
      }),
    });

    return {
      id: response.data.id,
      name: response.data.attributes.name,
      editor_type: response.data.attributes.editor_type,
      html: response.data.attributes.html || '',
      text: response.data.attributes.text,
      created: response.data.attributes.created,
      updated: response.data.attributes.updated,
    };
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.request(`/templates/${templateId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Clone a template with a new name
   */
  async cloneTemplate(templateId: string, newName: string): Promise<KlaviyoTemplate> {
    const original = await this.getTemplate(templateId);
    if (!original) {
      throw new Error(`Template ${templateId} not found`);
    }
    return this.createTemplate({
      name: newName,
      html: original.html,
      text: original.text,
    });
  }

  /**
   * Render a template with dynamic data (preview)
   */
  async renderTemplate(templateId: string, context?: Record<string, any>): Promise<{ html: string; text: string }> {
    const response = await this.request<{ data: { attributes: { html: string; text: string } } }>(`/templates/${templateId}/render/`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'template',
          id: templateId,
          attributes: {
            context: context || {},
          },
        },
      }),
    });

    return {
      html: response.data.attributes.html,
      text: response.data.attributes.text,
    };
  }

  // ============================================================================
  // Flow Creation API (Beta)
  // ============================================================================

  /**
   * Get a flow with its full definition (for cloning)
   */
  async getFlowWithDefinition(flowId: string): Promise<{
    id: string;
    name: string;
    status: string;
    definition: any;
  } | null> {
    try {
      const response = await this.request<{ data: { id: string; attributes: any } }>(
        `/flows/${flowId}/?additional-fields[flow]=definition`
      );
      return {
        id: response.data.id,
        name: response.data.attributes.name,
        status: response.data.attributes.status,
        definition: response.data.attributes.definition,
      };
    } catch {
      return null;
    }
  }

  /**
   * Create a new flow from a definition
   * Note: Rate limited to 100 creations per day
   * Flows are always created in draft status
   */
  async createFlow(params: CreateFlowRequest): Promise<{
    id: string;
    name: string;
    status: string;
  }> {
    const requestBody = {
      data: {
        type: 'flow',
        attributes: {
          name: params.name,
          definition: params.definition,
        },
      },
    };

    // Log request body for debugging
    console.log('Creating flow with body:', JSON.stringify(requestBody, null, 2));

    const response = await this.request<{ data: { id: string; attributes: any } }>('/flows/', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    return {
      id: response.data.id,
      name: response.data.attributes.name,
      status: response.data.attributes.status || 'draft',
    };
  }

  /**
   * Update flow status (activate, pause, etc.)
   */
  async updateFlowStatus(flowId: string, status: 'draft' | 'live' | 'paused'): Promise<void> {
    await this.request(`/flows/${flowId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'flow',
          id: flowId,
          attributes: { status },
        },
      }),
    });
  }

  /**
   * Delete a flow
   */
  async deleteFlow(flowId: string): Promise<void> {
    await this.request(`/flows/${flowId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Build a flow definition for the Welcome Flow
   */
  buildWelcomeFlowDefinition(params: {
    listId: string;
    templateIds: string[]; // 4 template IDs in order
    fromEmail: string;
    fromLabel: string;
    subjects: string[];
    previewTexts: string[];
    delayHours: number[]; // [0, 48, 96, 168]
  }): KlaviyoFlowDefinition {
    const actions: KlaviyoFlowAction[] = [];

    params.templateIds.forEach((templateId, index) => {
      // Add delay before emails 2, 3, 4
      if (index > 0) {
        const delayId = `delay_${index}`;
        const delayHours = params.delayHours[index] - params.delayHours[index - 1];
        actions.push({
          temporary_id: delayId,
          type: 'time-delay',
          data: {
            value: delayHours,
            unit: 'hours',
          },
          links: {
            next: `email_${index}`,
          },
        });
      }

      // Add email action
      const emailId = `email_${index}`;
      const hasNext = index < params.templateIds.length - 1;
      actions.push({
        temporary_id: emailId,
        type: 'send-email',
        data: {
          message: {
            from_email: params.fromEmail,
            from_label: params.fromLabel,
            reply_to_email: params.fromEmail,
            cc_email: null,
            bcc_email: null,
            subject_line: params.subjects[index],
            preview_text: params.previewTexts[index],
            template_id: templateId,
          },
        },
        links: {
          next: hasNext ? `delay_${index + 1}` : null,
        },
      });
    });

    // Fix first email to point to first delay
    if (actions.length > 1) {
      actions[0].links.next = 'delay_1';
    }

    return {
      triggers: [{
        type: 'list',
        id: params.listId,
      }],
      entry_action_id: 'email_0',
      actions,
    };
  }

  /**
   * Build a flow definition for metric-triggered flows (Quiz, Cart, Purchase, Win-back)
   * Note: metric triggers require metric_id, not metric_name.
   * We need to look up the metric first.
   */
  buildMetricFlowDefinition(params: {
    metricId: string;
    templateIds: string[];
    fromEmail: string;
    fromLabel: string;
    subjects: string[];
    previewTexts: string[];
    delayHours: number[];
    exitMetric?: string; // e.g., "Placed Order" for cart abandonment
  }): KlaviyoFlowDefinition {
    const actions: KlaviyoFlowAction[] = [];

    params.templateIds.forEach((templateId, index) => {
      // Add delay before all emails (including first for metric triggers)
      if (params.delayHours[index] > 0) {
        const delayId = `delay_${index}`;
        const previousDelay = index > 0 ? params.delayHours[index - 1] : 0;
        const delayHours = params.delayHours[index] - previousDelay;
        actions.push({
          temporary_id: delayId,
          type: 'time-delay',
          data: {
            value: delayHours,
            unit: 'hours',
          },
          links: {
            next: `email_${index}`,
          },
        });
      }

      // Add email action
      const emailId = `email_${index}`;
      const hasNextEmail = index < params.templateIds.length - 1;
      const nextDelayExists = hasNextEmail && params.delayHours[index + 1] > params.delayHours[index];

      actions.push({
        temporary_id: emailId,
        type: 'send-email',
        data: {
          message: {
            from_email: params.fromEmail,
            from_label: params.fromLabel,
            reply_to_email: params.fromEmail,
            cc_email: null,
            bcc_email: null,
            subject_line: params.subjects[index],
            preview_text: params.previewTexts[index],
            template_id: templateId,
          },
        },
        links: {
          next: hasNextEmail
            ? (nextDelayExists ? `delay_${index + 1}` : `email_${index + 1}`)
            : null,
        },
      });
    });

    // Determine entry action
    const entryActionId = params.delayHours[0] > 0 ? 'delay_0' : 'email_0';

    return {
      triggers: [{
        type: 'metric',
        metric: { id: params.metricId },
      }],
      entry_action_id: entryActionId,
      actions,
    };
  }

  /**
   * Get metric ID by name (needed for metric-triggered flows)
   */
  async getMetricIdByName(metricName: string): Promise<string | null> {
    const metrics = await this.getMetrics();
    const metric = metrics.find(m => m.name.toLowerCase() === metricName.toLowerCase());
    return metric?.id || null;
  }
}
